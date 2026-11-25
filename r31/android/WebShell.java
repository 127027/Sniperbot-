package com.r31.paperbot;
import android.content.Context;
import android.net.Uri;
import android.webkit.*;
import java.io.*;
import java.util.*;
final class WebShell {
 static final String ORIGIN="https://appassets.androidplatform.net";
 private static final Set<String> ASSETS=new HashSet<>(Arrays.asList("index.html","style.css","app.js","mobile-runtime.mjs","mobile-feed.mjs","policy.mjs","paper-engine.mjs","broadcast.mjs","device-account.mjs","worker.html","worker.mjs"));
 private static WebResourceResponse deny(){return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
 static WebView make(Context context,boolean network){
  WebView web=new WebView(context);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(false);s.setDomStorageEnabled(false);WebView.setWebContentsDebuggingEnabled(false);web.addJavascriptInterface(new LocalStore(context),"R31Local");
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){return true;}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){Uri u=req.getUrl();
    if("https".equals(u.getScheme())&&"appassets.androidplatform.net".equals(u.getHost())&&u.getPort()==-1&&u.getPath()!=null&&u.getPath().startsWith("/assets/")&&"GET".equals(req.getMethod())){
     String name=u.getPath().substring(8);if(!ASSETS.contains(name))return deny();try{String mime=name.endsWith(".html")?"text/html":name.endsWith(".css")?"text/css":"text/javascript";Map<String,String> headers=new HashMap<>();headers.put("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self'; connect-src "+(network?"https://raw.githubusercontent.com":"'none'")+"; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");headers.put("X-Content-Type-Options","nosniff");headers.put("Cache-Control","no-store");return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,context.getAssets().open(name));}catch(IOException e){return deny();}
    }
    if(network&&"https".equals(u.getScheme())&&"raw.githubusercontent.com".equals(u.getHost())&&u.getPort()==-1&&"GET".equals(req.getMethod())&&!req.isForMainFrame()&&u.getPath()!=null&&u.getPath().startsWith("/127027/Sniperbot-/refs/heads/codex/r31-control-center-paper/r31/broadcast/"))return null;
    return deny();
   }
   @Override public void onReceivedSslError(WebView v,SslErrorHandler handler,android.net.http.SslError error){handler.cancel();}
  });return web;
 }
}