package com.r31.paperbot;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.*;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.net.ssl.HttpsURLConnection;
import org.json.*;
public final class UpdateBridge {
 private final Activity a; private final AtomicBoolean busy=new AtomicBoolean(false);
 private volatile String state="R41 · Bereit";
 UpdateBridge(Activity a){this.a=a;}
 @JavascriptInterface public String status(){return state;}
 private static final String BASE="https://raw.githubusercontent.com/127027/Sniperbot-/";
 private static byte[] get(String url,int limit)throws Exception{
  HttpsURLConnection c=(HttpsURLConnection)new URL(url).openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setUseCaches(false);
  try{if(c.getResponseCode()!=200)throw new IOException("HTTP_"+c.getResponseCode());return LocalStore.bytes(c.getInputStream(),limit);}finally{c.disconnect();}
 }
 private static String sha(byte[] bytes)throws Exception{StringBuilder s=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(bytes))s.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return s.toString();}
 private static Signature[] signatures(PackageInfo p){return Build.VERSION.SDK_INT>=28?p.signingInfo==null?null:p.signingInfo.getApkContentsSigners():p.signatures;}
 private static long version(PackageInfo p){return Build.VERSION.SDK_INT>=28?p.getLongVersionCode():p.versionCode;}
 @JavascriptInterface public void check(){if(!busy.compareAndSet(false,true))return;state="Prüft freigegebene Version …";new Thread(()->{try{
  JSONObject m=new JSONObject(new String(get(BASE+"refs/heads/main/r40/releases.json",65536),StandardCharsets.UTF_8));
  if(!"r40.release.v1".equals(m.optString("schema"))||!"PAPER_ONLY".equals(m.optString("mode")))throw new IOException("INVALID_RELEASE");
  JSONObject d=m.optJSONObject("android");if(d==null){state="Keine Android-Version freigegeben";return;}
  PackageManager pm=a.getPackageManager();int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
  PackageInfo current=pm.getPackageInfo(a.getPackageName(),flags);long v=d.getLong("version_code");if(v<=version(current)){state="Android ist aktuell";return;}
  String commit=d.getString("commit"),path=d.getString("path"),hash=d.getString("sha256");int size=d.getInt("bytes");
  if(!commit.matches("[a-f0-9]{40}")||!path.matches("r40/artifacts/[A-Za-z0-9_-]+[.]apk")||!hash.matches("[a-f0-9]{64}")||size<1||size>32*1024*1024)throw new IOException("INVALID_APK_METADATA");
  state="Lädt und prüft APK …";byte[] bytes=get(BASE+commit+"/"+path,size);if(bytes.length!=size||!sha(bytes).equals(hash))throw new IOException("HASH_MISMATCH");
  File dir=new File(a.getFilesDir(),"r40-update");if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("UPDATE_DIR");
  File apk=new File(dir,"candidate.apk");try(FileOutputStream out=new FileOutputStream(apk)){out.write(bytes);out.getFD().sync();}
  PackageInfo candidate=pm.getPackageArchiveInfo(apk.getPath(),flags);if(candidate==null||!a.getPackageName().equals(candidate.packageName)||version(candidate)!=v||signatures(current)==null||!Arrays.equals(signatures(current),signatures(candidate))){apk.delete();throw new IOException("SIGNATURE_OR_PACKAGE_MISMATCH");}
  if(Build.VERSION.SDK_INT>=26&&!pm.canRequestPackageInstalls()){state="Installationsfreigabe erforderlich; danach erneut aktualisieren";a.runOnUiThread(()->a.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+a.getPackageName()))));return;}
  String snapshot=new LocalStore(a).read();if(snapshot.isEmpty()||snapshot.startsWith("!"))throw new IOException("ACCOUNT_BACKUP_UNAVAILABLE");JSONObject account=new JSONObject(snapshot);if(!"r31.device.account.v1".equals(account.optString("schema")))throw new IOException("ACCOUNT_BACKUP_INVALID");
  File backup=new File(dir,"account-"+System.currentTimeMillis()+".json");try(FileOutputStream out=new FileOutputStream(backup)){out.write(snapshot.getBytes(StandardCharsets.UTF_8));out.getFD().sync();}
  state="APK geprüft · Installation bestätigen";a.runOnUiThread(()->{try{Intent i=new Intent(Intent.ACTION_VIEW);i.setDataAndType(Uri.parse("content://com.r31.paperbot.update/candidate.apk"),"application/vnd.android.package-archive");i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);a.startActivity(i);}catch(Exception e){state="Installer nicht verfügbar; bisherige Version bleibt";}});
 }catch(Exception e){state="Update blockiert: "+e.getMessage();}finally{busy.set(false);}},"r40-update").start();}
}
