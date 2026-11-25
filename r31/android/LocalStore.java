package com.r31.paperbot;
import android.content.Context;
import android.util.AtomicFile;
import android.webkit.JavascriptInterface;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
public final class LocalStore {
 private static final Object LOCK=new Object();
 private final AtomicFile file;
 public LocalStore(Context c){file=new AtomicFile(new File(c.getFilesDir(),"r31-account.json"));}
 static byte[] bytes(InputStream input,int limit)throws IOException{try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n,total=0;while((n=in.read(b))!=-1){total+=n;if(total>limit)throw new IOException("FILE_TOO_LARGE");out.write(b,0,n);}return out.toByteArray();}}
 private String readLocked()throws IOException{String p=file.getBaseFile().getPath();if(!file.getBaseFile().exists()&&!new File(p+".bak").exists()&&!new File(p+".new").exists())return "";return new String(bytes(file.openRead(),16*1024*1024),StandardCharsets.UTF_8);}
 @JavascriptInterface public String read(){synchronized(LOCK){try{return readLocked();}catch(Exception e){return "!READ_ERROR";}}}
 @JavascriptInterface public boolean compareAndSwap(String expected,String next){synchronized(LOCK){FileOutputStream out=null;try{
  if(expected==null||next==null||next.getBytes(StandardCharsets.UTF_8).length>8*1024*1024)return false;
  String current=readLocked();if(!current.equals(expected))return false;
  JSONObject obj=new JSONObject(next);if(!"r31.device.account.v1".equals(obj.optString("schema"))||obj.optString("account_id").isEmpty())return false;
  if(!current.isEmpty()&&!new JSONObject(current).getString("account_id").equals(obj.getString("account_id")))return false;
  out=file.startWrite();out.write(next.getBytes(StandardCharsets.UTF_8));file.finishWrite(out);return true;
 }catch(Exception e){if(out!=null)file.failWrite(out);return false;}}}
}