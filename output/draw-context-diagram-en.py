from pathlib import Path
import math,html
from PIL import Image,ImageDraw,ImageFont
out=Path('docs/architecture')
W,H=2600,2200
cx,cy=1300,1100
radius=230
image=Image.new('RGB',(W,H),'white')
draw=ImageDraw.Draw(image)
font_path='C:/Windows/Fonts/arial.ttf'
font=ImageFont.truetype(font_path,25)
bold=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',29)
small=ImageFont.truetype(font_path,23)
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="white"/>']
def text(x,y,lines,size=25,strong=False):
    f=bold if strong else small if size==23 else font
    line_height=size+9
    top=y-(len(lines)-1)*line_height/2
    for i,line in enumerate(lines):
        yy=top+i*line_height
        draw.text((x,yy),line,font=f,fill='#202020',anchor='mm',stroke_width=0)
        svg.append(f'<text x="{x:.1f}" y="{yy:.1f}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="{size}" font-weight="{"700" if strong else "400"}" fill="#202020">{html.escape(line)}</text>')
def line_arrow(a,b):
    draw.line([a,b],fill='#555555',width=3)
    ux,uy=(b[0]-a[0]),(b[1]-a[1])
    n=math.hypot(ux,uy);ux/=n;uy/=n
    p1=(b[0]-14*ux+7*uy,b[1]-14*uy-7*ux)
    p2=(b[0]-14*ux-7*uy,b[1]-14*uy+7*ux)
    draw.line([p1,b,p2],fill='#555555',width=3)
    svg.append(f'<path d="M{a[0]:.1f},{a[1]:.1f} L{b[0]:.1f},{b[1]:.1f} M{p1[0]:.1f},{p1[1]:.1f} L{b[0]:.1f},{b[1]:.1f} L{p2[0]:.1f},{p2[1]:.1f}" fill="none" stroke="#555" stroke-width="3"/>')
def label(x,y,lines):
    widths=[draw.textbbox((0,0),s,font=small)[2] for s in lines]
    w=max(widths)+20;h=len(lines)*32+12
    draw.rectangle([x-w/2,y-h/2,x+w/2,y+h/2],fill='white')
    svg.append(f'<rect x="{x-w/2:.1f}" y="{y-h/2:.1f}" width="{w}" height="{h}" fill="white"/>')
    text(x,y,lines,23)
# Each input flows from external entity into the process.
entities=[
(-90,'Parent',['Linking and service requests'],['Child and trip information']),
(-50,'Bus Attendant',['Attendance and reports'],['Trip schedules and details']),
(-10,'VietMap',['Map and route data'],['Map and optimization requests']),
(30,'Cloudinary',['Image URLs'],['Images and storage requests']),
(70,'Email / SMTP Service',None,['Email content']),
(110,'Expo Push Service',None,['Notification content']),
(150,'Driver',['GPS data and trip reports'],['Schedules and assignments']),
(190,'School Admin',['Records, assignments, approvals'],['School operations information']),
(230,'System Admin',['Records and dispatch requests'],['Dispatch and monitoring results']),
]
# Circle and entity boxes follow the monochrome DFD context notation.
draw.ellipse([cx-radius,cy-radius,cx+radius,cy+radius],outline='#555555',width=3)
svg.append(f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="white" stroke="#555" stroke-width="3"/>')
text(cx,cy-40,['0'],29,True)
text(cx,cy+10,['SYSTEM','ROAD TO SCHOOL'],29,True)
for angle,name,incoming,outgoing in entities:
    theta=math.radians(angle);ux,uy=math.cos(theta),math.sin(theta)
    nx,ny=-uy,ux
    ex,ey=cx+1000*ux,cy+900*uy
    bw,bh=370,100
    draw.rectangle([ex-bw/2,ey-bh/2,ex+bw/2,ey+bh/2],outline='#555555',width=3)
    svg.append(f'<rect x="{ex-bw/2:.1f}" y="{ey-bh/2:.1f}" width="{bw}" height="{bh}" fill="white" stroke="#555" stroke-width="3"/>')
    text(ex,ey,[name],25)
    dist=math.hypot(ex-cx,ey-cy)
    vx,vy=(ex-cx)/dist,(ey-cy)/dist
    nx,ny=-vy,vx
    edge=min((bw/2)/max(abs(vx),1e-9),(bh/2)/max(abs(vy),1e-9))
    start=(cx+vx*(radius+3),cy+vy*(radius+3))
    end=(ex-vx*(edge+4),ey-vy*(edge+4))
    flows=[(incoming,1,True),(outgoing,-1,False)] if incoming else [(outgoing,0,False)]
    for words,side,is_input in flows:
        offset=side*22
        a=(start[0]+nx*offset,start[1]+ny*offset)
        b=(end[0]+nx*offset,end[1]+ny*offset)
        line_arrow(b,a) if is_input else line_arrow(a,b)
        # Label each directional flow independently in the outer half of its lane.
        mx=a[0]+(b[0]-a[0])*0.56+nx*side*66
        my=a[1]+(b[1]-a[1])*0.56+ny*side*66
        if angle == -90:
            mx=cx+side*260
            my=520
        label(mx,my,words)
image.save(out/'system-context-diagram-en.png')
svg.append('</svg>')
(out/'system-context-diagram-en.svg').write_text('\n'.join(svg),encoding='utf-8')
