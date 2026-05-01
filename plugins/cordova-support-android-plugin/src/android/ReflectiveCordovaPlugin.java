package by.chemerisuk.cordova.support;

import android.util.Pair;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.LOG;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;


public class ReflectiveCordovaPlugin extends CordovaPlugin {
    private static final String TAG = "ReflectiveCordovaPlugin";
    private Map<String, Pair<Method, ExecutionThread>> commandFactories;

    public final void initialize(CordovaInterface cordova, CordovaWebView webView) {
        commandFactories = new HashMap<>();
        for (Method method : getClass().getDeclaredMethods()) {
            CordovaMethod cordovaMethod = method.getAnnotation(CordovaMethod.class);
            if (cordovaMethod == null) continue;

            String methodAction = cordovaMethod.action();
            if (methodAction.isEmpty()) {
                methodAction = method.getName();
            }
            boolean paramTypesValid = false;
            Class<?>[] paramTypes = method.getParameterTypes();
            if (paramTypes.length == 1) {
                paramTypesValid = CallbackContext.class.equals(paramTypes[0]);
            } else if (paramTypes.length == 2) {
                paramTypesValid = CordovaArgs.class.equals(paramTypes[0]) &&
                        CallbackContext.class.equals(paramTypes[1]);
            }
            if (!paramTypesValid) {
                throw new RuntimeException("Cordova method " +
                        methodAction + " does not have valid parameters");
            }
            commandFactories.put(methodAction, new Pair<>(method, cordovaMethod.value()));
            // suppress Java language access checks to improve performance of future calls
            method.setAccessible(true);
        }
    }

    @Override
    public final boolean execute(String action, CordovaArgs args, CallbackContext callbackContext) {
        Pair<Method, ExecutionThread> pair = commandFactories.get(action);
        if (pair != null) {
            // always create a new command to avoid concurrency conflicts
            Runnable command = createCommand(pair.first, args, callbackContext);
            ExecutionThread executionThread = pair.second;
            if (executionThread == ExecutionThread.WORKER) {
                cordova.getThreadPool().execute(command);
            } else if (executionThread == ExecutionThread.UI) {
                cordova.getActivity().runOnUiThread(command);
            } else {
                command.run();
            }
            return true;
        }
        return false;
    }

    private Runnable createCommand(final Method method, final CordovaArgs args, final CallbackContext callbackContext) {
        return new Runnable() {
            @Override
            public void run() {
                try {
                    if (CordovaArgs.class.isAssignableFrom(method.getParameterTypes()[0])) {
                        method.invoke(ReflectiveCordovaPlugin.this, args, callbackContext);
                    } else {
                        method.invoke(ReflectiveCordovaPlugin.this, callbackContext);
                    }
                } catch (Throwable e) {
                    if (e instanceof InvocationTargetException) {
                        e = ((InvocationTargetException)e).getTargetException();
                    }
                    LOG.e(TAG, "Uncaught exception at " + getClass().getSimpleName() + "#" + method.getName(), e);
                    callbackContext.error(e.getMessage());
                }
            }
        };
    }
}
