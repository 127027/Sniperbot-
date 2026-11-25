package com.r31.paperbot;
import android.app.*;
import android.content.*;
import android.os.*;
import android.webkit.*;
import java.net.*;
import javax.net.ssl.HttpsURLConnection;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.*;
import org.json.*;
public final class PaperSyncService extends Service {
 private static final String BASE="https://raw.githubusercontent.com/127027/Sniperbot-/refs/heads/codex/r31-control-center-paper/r31/broadcast/";
 private static final String CHANNEL="r31_paper_sync";
 private static final int NOTIFICATION=3102;
 private static volatile String state="AUS";
 static String status(){return state;}
 static void setStatus(String s){state=s;}
 private final Handler main=new Handler(Looper.getMainLooper());
 private ExecutorService io;private WebView worker;private boolean running=false,ready=false,busy=false;
 private PowerManager.WakeLock wake;
 private final Runnable tick=()->poll();
 private final Runnable watchdog=()->{if(busy){setStatus("TIMEOUT – keine Buchung bestätigt");stopSelf();}};
 @Override public IBinder onBind(Intent i){return null;}
 @Override public void onCreate(){super.onCreate();io=Executors.newSingleThreadExecutor();NotificationManager nm=getSystemService(NotificationManager.class);nm.createNotificationChannel(new NotificationChannel(CHANNEL,"Paper-Signalabruf",NotificationManager.IMPORTANCE_LOW));PowerManager pm=getSystemService(PowerManager.class);wake=pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"R31:signalPoll");wake.setReferenceCounted(false);}
 private Notification notification(String text){
  PendingIntent open=PendingIntent.getActivity(this,1,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  PendingIntent stop=PendingIntent.getService(this,2,new Intent(this,PaperSyncService.class).setAction("STOP"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  return new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_popup_sync).setContentTitle("R31 Paperbot – Testgeld").setContentText(text).setContentIntent(open).setOngoing(true).addAction(new Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel,"Stoppen",stop).build()).build();
 }
 @Override public int onStartCommand(Intent i,int flags,int id){
  if(i!=null&&"STOP".equals(i.getAction())){stopSelf();return START_NOT_STICKY;}
  if(running)return START_NOT_STICKY;
  try{startForeground(NOTIFICATION,notification("Signalabruf wird gestartet"));running=true;setStatus("STARTET");worker=WebShell.make(this,false);worker.addJavascriptInterface(new Object(){@JavascriptInterface public void ready(){main.post(()->{if(running&&!ready){ready=true;poll();}});}@JavascriptInterface public void failed(String message){main.post(()->{setStatus("WORKER_ERROR: "+message);stopSelf();});}},"R31Worker");worker.loadUrl(WebShell.ORIGIN+"/assets/worker.html");main.postDelayed(()->{if(running&&!ready){setStatus("WORKER_START_TIMEOUT");stopSelf();}},30000);}
  catch(Exception e){setStatus("START_FAILED: "+e.getClass().getSimpleName());stopSelf();}
  return START_NOT_STICKY;
 }
 private static byte[] get(String path)throws Exception{
  HttpsURLConnection c=(HttpsURLConnection)new URL(BASE+path).openConnection();c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setInstanceFollowRedirects(false);c.setUseCaches(false);c.setRequestMethod("GET");c.setRequestProperty("Cache-Control","no-cache");
  try{if(c.getResponseCode()!=200)throw new java.io.IOException("GITHUB_HTTP_"+c.getResponseCode());return LocalStore.bytes(c.getInputStream(),2*1024*1024);}finally{c.disconnect();}
 }
 private static String sha(byte[] b)throws Exception{MessageDigest md=MessageDigest.getInstance("SHA-1");md.update(("blob "+b.length+"\0").getBytes(StandardCharsets.UTF_8));byte[] result=md.digest(b);StringBuilder s=new StringBuilder();for(byte x:result)s.append(String.format(java.util.Locale.ROOT,"%02x",x&255));return s.toString();}
 private static String fetchLatest()throws Exception{
  JSONObject p=new JSONObject(new String(get("latest.json"),StandardCharsets.UTF_8));if(!"r31.broadcast.pointer.v1".equals(p.optString("schema")))throw new java.io.IOException("INVALID_POINTER");
  if("NOT_PUBLISHING".equals(p.optString("status")))return "null";
  long n=p.getLong("sequence");String rel="signals/"+String.format(java.util.Locale.ROOT,"%010d",n)+".json",hash=p.optString("blob_sha");
  if(n<1||n>9007199254740991L||!"PUBLISHED".equals(p.optString("status"))||!p.optString("path").equals("r31/broadcast/"+rel)||!hash.matches("[a-f0-9]{40}"))throw new java.io.IOException("INVALID_POINTER");
  byte[] bytes=get(rel);if(!sha(bytes).equals(hash))throw new java.io.IOException("SIGNAL_POINTER_MISMATCH");JSONObject signal=new JSONObject(new String(bytes,StandardCharsets.UTF_8));if(signal.getLong("sequence")!=n)throw new java.io.IOException("SIGNAL_SEQUENCE_MISMATCH");
  return new JSONObject().put("signal",signal).put("blob_sha",hash).toString();
 }
 private void poll(){
  if(!running||!ready||busy)return;busy=true;setStatus("PRÜFT");wake.acquire(45000);main.postDelayed(watchdog,45000);
  io.execute(()->{try{String raw=fetchLatest();main.post(()->{if(!running||worker==null)return;worker.evaluateJavascript("window.r31Process("+JSONObject.quote(raw)+")",result->{
   if(!running)return;try{Object value=new JSONTokener(result).nextValue();JSONObject report=new JSONObject(String.valueOf(value));finish(report.optString("state","WORKER_ERROR")+(report.has("error")?": "+report.optString("error"):""));}catch(Exception e){finish("WORKER_RESPONSE_ERROR");}
  });});}catch(Exception e){main.post(()->{if(running)finish("FEED_ERROR: "+e.getMessage());});}});
 }
 private void finish(String s){if(!running)return;busy=false;main.removeCallbacks(watchdog);if(wake.isHeld())wake.release();setStatus(s+" · "+java.time.Instant.now().toString());getSystemService(NotificationManager.class).notify(NOTIFICATION,notification(s));main.removeCallbacks(tick);main.postDelayed(tick,180000);}
 @Override public void onTimeout(int startId,int fgsType){setStatus("ANDROID_TIME_LIMIT");stopSelf();}
 @Override public void onDestroy(){running=false;ready=false;busy=false;main.removeCallbacksAndMessages(null);if(io!=null)io.shutdownNow();if(wake!=null&&wake.isHeld())wake.release();if(worker!=null){worker.removeJavascriptInterface("R31Local");worker.removeJavascriptInterface("R31Worker");worker.destroy();worker=null;}stopForeground(STOP_FOREGROUND_REMOVE);if(!state.startsWith("START_FAILED")&&!state.contains("TIMEOUT")&&!state.startsWith("WORKER_ERROR")&&!state.equals("ANDROID_TIME_LIMIT"))setStatus("AUS");super.onDestroy();}
}