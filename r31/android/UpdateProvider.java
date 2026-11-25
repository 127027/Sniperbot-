package com.r31.paperbot;
import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
public final class UpdateProvider extends ContentProvider{
 public boolean onCreate(){return true;}
 private File file(Uri u){if(!"/candidate.apk".equals(u.getPath()))throw new SecurityException("INVALID_PATH");return new File(getContext().getFilesDir(),"r40-update/candidate.apk");}
 public ParcelFileDescriptor openFile(Uri u,String mode)throws FileNotFoundException{if(!"r".equals(mode))throw new SecurityException("READ_ONLY");return ParcelFileDescriptor.open(file(u),ParcelFileDescriptor.MODE_READ_ONLY);}
 public String getType(Uri u){file(u);return "application/vnd.android.package-archive";}
 public Cursor query(Uri u,String[] cols,String selection,String[] args,String order){File f=file(u);MatrixCursor c=new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE});c.addRow(new Object[]{"candidate.apk",f.length()});return c;}
 public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}public int update(Uri u,ContentValues v,String s,String[] a){throw new UnsupportedOperationException();}public int delete(Uri u,String s,String[] a){throw new UnsupportedOperationException();}
}
