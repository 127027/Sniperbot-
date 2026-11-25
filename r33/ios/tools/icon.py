# Reproducible opaque icon, no external assets/dependencies.
import struct,zlib
from pathlib import Path
n=1024
rows=[]
for y in range(n):
    row=bytearray()
    for x in range(n):
        col=(12,25,31)
        for left,top,right in [(230,610,365),(445,460,580),(660,270,795)]:
            if left<=x<right and top<=y<795:col=(46,199,158)
        if 200<=x<=824 and abs(y-(780-(x-200)*0.82))<13:col=(228,247,241)
        row.extend(col)
    rows.append(b'\0'+row)
def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
out=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',n,n,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
path=Path(__file__).resolve().parent.parent/'App/Assets.xcassets/AppIcon.appiconset/Icon.png'
path.write_bytes(out)
