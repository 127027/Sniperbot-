package com.r31.paperbot;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.webkit.*;
public final class MainActivity extends Activity {
 private WebView web;
 private boolean visible=false;
 public final class BackgroundBridge {
  @JavascriptInterface public void start(){runOnUiThread(()->{if(!visible)return;try{
   if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},31);
   startForegroundService(new Intent(MainActivity.this,PaperSyncService.class));
  }catch(Exception e){PaperSyncService.setStatus("START_FAILED: "+e.getClass().getSimpleName());}});}
  @JavascriptInterface public void stop(){runOnUiThread(()->stopService(new Intent(MainActivity.this,PaperSyncService.class)));}
  @JavascriptInterface public String status(){return PaperSyncService.status();}
 }
 @Override public void onCreate(Bundle b){super.onCreate(b);web=WebShell.make(this,true);setContentView(web);web.addJavascriptInterface(new BackgroundBridge(),"R31Background");web.loadUrl(WebShell.ORIGIN+"/assets/index.html");}
 @Override protected void onResume(){super.onResume();visible=true;if(web!=null){web.onResume();web.evaluateJavascript("window.r31Resume && window.r31Resume()",null);}}
 @Override protected void onPause(){visible=false;if(web!=null){web.evaluateJavascript("window.r31Pause && window.r31Pause()",null);web.onPause();}super.onPause();}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("R31Local");web.removeJavascriptInterface("R31Background");web.destroy();web=null;}super.onDestroy();}
}