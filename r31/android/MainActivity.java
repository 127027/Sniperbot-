package com.r31.paperbot;
import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.util.AtomicFile;
import android.webkit.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
public final class MainActivity extends Activity {
 private WebView web;
 private static final String ORIGIN="https://appassets.androidplatform.net";
 private static final Set<String> ASSETS=new HashSet<>(Arrays.asList("index.html","style.css","app.js","mobile-runtime.mjs","mobile-feed.mjs","policy.mjs","paper-engine.mjs","broadcast.mjs","device-account.mjs"));
 private static byte[] bytes(InputStream in,int limit) throws IOException {try(InputStream input=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n,total=0;while((n=input.read(b))!=-1){total+=n;if(total>limit)throw new IOException("FILE_TOO_LARGE");out.write(b,0,n);}return out.toByteArray();}}
 public final class LocalStore {
  private final AtomicFile file=new AtomicFile(new File(getFilesDir(),"r31-account.json"));
  @JavascriptInterface public synchronized String read(){try{if(!file.getBaseFile().exists()&&!new File(file.getBaseFile().getPath()+".bak").exists())return "";return new String(bytes(file.openRead(),16*1024*1024),StandardCharsets.UTF_8);}catch(Exception e){return "!READ_ERROR";}}
  @JavascriptInterface public synchronized boolean write(String json){if(json==null||json.length()>8*1024*1024)return false;FileOutputStream out=null;try{new org.json.JSONObject(json);out=file.startWrite();out.write(json.getBytes(StandardCharsets.UTF_8));file.finishWrite(out);return true;}catch(Exception e){if(out!=null)file.failWrite(out);return false;}}
 }
 private WebResourceResponse deny(){return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
 @Override public void onCreate(Bundle b){super.onCreate(b);web=new WebView(this);setContentView(web);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(false);s.setDomStorageEnabled(false);WebView.setWebContentsDebuggingEnabled(false);web.addJavascriptInterface(new LocalStore(),"R31Local");
 web.setWebViewClient(new WebViewClient(){
  @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){return true;}
  @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){Uri u=req.getUrl();if("https".equals(u.getScheme())&&"appassets.androidplatform.net".equals(u.getHost())&&u.getPort()==-1&&u.getPath()!=null&&u.getPath().startsWith("/assets/")){
   String name=u.getPath().substring(8);if(!ASSETS.contains(name))return deny();try{String mime=name.endsWith(".html")?"text/html":name.endsWith(".css")?"text/css":"text/javascript";Map<String,String> headers=new HashMap<>();headers.put("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self'; connect-src https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");headers.put("X-Content-Type-Options","nosniff");headers.put("Cache-Control","no-store");return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open(name));}catch(IOException e){return deny();}
  }
  if("https".equals(u.getScheme())&&"raw.githubusercontent.com".equals(u.getHost())&&u.getPort()==-1&&"GET".equals(req.getMethod())&&!req.isForMainFrame()&&u.getPath()!=null&&u.getPath().startsWith("/127027/Sniperbot-/refs/heads/codex/r31-control-center-paper/r31/broadcast/"))return null;
  return deny();}
  @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,android.net.http.SslError error){handler.cancel();}
 });web.loadUrl(ORIGIN+"/assets/index.html");}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.evaluateJavascript("window.r31Resume && window.r31Resume()",null);}}
 @Override protected void onPause(){if(web!=null){web.evaluateJavascript("window.r31Pause && window.r31Pause()",null);web.onPause();}super.onPause();}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("R31Local");web.destroy();web=null;}super.onDestroy();}
}