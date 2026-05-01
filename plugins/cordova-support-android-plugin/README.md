# cordova-support-android-plugin

[![NPM version][npm-version]][npm-url] [![NPM downloads][npm-downloads]][npm-url] [![NPM total downloads][npm-total-downloads]][npm-url] [![Twitter][twitter-follow]][twitter-url]

[npm-url]: https://www.npmjs.com/package/cordova-support-android-plugin
[npm-version]: https://img.shields.io/npm/v/cordova-support-android-plugin.svg
[npm-downloads]: https://img.shields.io/npm/dm/cordova-support-android-plugin.svg
[npm-total-downloads]: https://img.shields.io/npm/dt/cordova-support-android-plugin.svg?label=total+downloads
[twitter-url]: https://twitter.com/chemerisuk
[twitter-follow]: https://img.shields.io/twitter/follow/chemerisuk.svg?style=social&label=Follow%20me

The plugin introduces new base class for Android Cordova plugins called `ReflectiveCordovaPlugin` that extends `CordovaPlugin` and allows to reduce boilerplate code.

## Index

<!-- MarkdownTOC levels="2,3" autolink="true" -->

- [Default implementation of execute](#default-implementation-of-execute)
- [Asynchronous actions](#asynchronous-actions)
- [ProGuard notes](#proguard-notes)

<!-- /MarkdownTOC -->

## Default implementation of execute

This is an example of typical cordova plugin implementation:

```java
// required imports...

public class MyPlugin extends CordovaPlugin {
    private static final String METHOD_1 = "method1";
    private static final String METHOD_2 = "method2";

    @Override
    public boolean execute(String action, CordovaArgs args, CallbackContext callbackContext) throws JSONException {
        if (METHOD_1.equals(action)) {
            method1(args, callbackContext);
        } else if (METHOD_2.equals(action)) {
            method2(callbackContext);
        // more methods might go here...
        } else {
            return false;
        }
        return true;
    }

    protected void method1(CordovaArgs args, CallbackContext callbackContext) {
        // method1 implementation goes here
    }

    protected void method2(CallbackContext callbackContext) {
        // method2 implementation goes here
    }
}
```

Below is equal of code using `ReflectiveCordovaPlugin`:

```java
// required imports...
import by.chemerisuk.cordova.support.ReflectiveCordovaPlugin;

public class MyPlugin extends ReflectiveCordovaPlugin {
    @CordovaMethod
    protected void method1(CordovaArgs args, CallbackContext callbackContext) {
        // method1 implementation goes here
    }

    @CordovaMethod
    protected void method2(CallbackContext callbackContext) {
        // method2 implementation goes here
    }
}
```

## Asynchronous actions

Cordova best practise is to invoke time-consuming logic in a separate thread:

```java
// required imports...

public class MyPlugin extends CordovaPlugin {
    private static final String METHOD_1 = "method1";

    @Override
    public boolean execute(String action, CordovaArgs args, CallbackContext callbackContext) throws JSONException {
        if (METHOD_1.equals(action)) {
            method1(callbackContext);
        } else {
            return false;
        }
        return true;
    }

    protected void method1(CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable {
            @Override
            public void run() {
                // method1 implementation goes here
            }
        });
    }
}
```

`@CordovaMethod` annotation allows to specify execution thread as enumaration paratemer:

```java
// required imports...
import by.chemerisuk.cordova.support.ReflectiveCordovaPlugin;
import static by.chemerisuk.cordova.support.ExecutionThread.WORKER;

public class MyPlugin extends ReflectiveCordovaPlugin {

    @CordovaMethod(WORKER)
    protected void method1(CallbackContext callbackContext) {
        // method1 implementation goes here
    }

}
```

## ProGuard notes

__Only needed for version 1__.

If you obfuscate app with ProGuard then `proguard-rules.pro` usually contains rules:

```
-keep class org.apache.cordova.* { *; }
-keep class org.apache.cordova.engine.* { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin
```

`ReflectiveCordovaPlugin` uses method names to match an appropriate action. Therefore you should keep names for methods with `@CordovaMethod` annotation:

```
-keepclassmembers class ** {
    @by.chemerisuk.cordova.support.CordovaMethod *;
}

keep public enum by.chemerisuk.cordova.support.ReflectiveCordovaPlugin$** {
    **[] $VALUES;
    public *;
}
```







