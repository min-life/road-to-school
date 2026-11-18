from pathlib import Path
import html, math, json
from PIL import Image,ImageDraw,ImageFont
W,H=3500,2630
out=Path('docs/architecture')
image=Image.new('RGB',(W,H),'white')
draw=ImageDraw.Draw(image)
normal=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',28)
bold=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',32)
title_font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',38)
navy='#174768';fill='#F1F4F6'
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="white"/>']
def text(x,y,value,strong=False,size=None):
    font=title_font if size==38 else bold if strong else normal
    actual=size or (32 if strong else 28)
    draw.text((x,y),value,font=font,fill='#172832',anchor='mm')
    svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="{actual}" font-weight="{"700" if strong else "400"}" fill="#172832">{html.escape(value)}</text>')
def box(x,y,w,h,rounded=False):
    draw.rounded_rectangle((x,y,x+w,y+h),radius=55 if rounded else 0,fill=fill,outline=navy,width=4)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{55 if rounded else 0}" fill="{fill}" stroke="{navy}" stroke-width="4"/>')
def arrow(x1,x2,y,label):
    draw.line([(x1,y),(x2,y)],fill=navy,width=3)
    sign=1 if x2>x1 else -1
    points=[(x2,y),(x2-sign*17,y-8),(x2-sign*17,y+8)]
    draw.polygon(points,fill=navy)
    svg.append(f'<path d="M{x1},{y} H{x2}" fill="none" stroke="{navy}" stroke-width="3"/><polygon points="{" ".join(str(x)+","+str(yy) for x,yy in points)}" fill="{navy}"/>')
    text((x1+x2)//2,y-20,label)
humans=[
('System Admin',[
('in','School and fleet records'),('in','Route planning requests'),('in','Vehicle and driver assignments'),
('in','Trip generation requests'),('out','Route plans and trip schedules'),('out','Operational alerts and reports')]),
('School Admin',[
('in','Student and attendant records'),('in','Attendant assignments'),('in','Route plan approval decisions'),
('in','School calendar changes'),('out','Route plans and trip schedules'),('out','Attendance and incident reports')]),
('Parent',[
('in','Student linking requests'),('in','Student leave notices'),('in','Pickup/drop-off change requests'),
('out','Linked student profiles'),('out','Trip tracking and attendance'),('out','Request results and alerts')]),
('Driver',[
('in','GPS updates'),('in','Trip status updates'),('in','Driver leave notices'),('in','Incident reports'),
('out','Trip assignments and routes'),('out','Request results and alerts')]),
('Bus Attendant',[
('in','Readiness confirmations'),('in','Boarding/alighting records'),('in','Attendant leave notices'),('in','Incident reports'),
('out','Trip assignments and rosters'),('out','Request results and alerts')])]
providers=[
('VietMap',[
('out','Address lookup requests'),('in','Address and location data'),('out','Routing requests'),
('in','Routes and travel times'),('out','Route optimization requests'),('in','Optimized route plans')]),
('Cloudinary',[
('out','Image uploads'),('out','Image management requests'),('in','Image URLs and upload results')]),
('Email / SMTP Service',[
('out','Email delivery requests'),('in','Submission acceptance or failure')]),
('Expo Push Service',[
('out','Push notification requests'),('in','Push tickets and receipts')])]
def connected_flow(start, end, bend_x, label, label_x, direction):
    start_x, start_y = start
    end_x, end_y = end
    # The straight section carries the label; the curve fans into the process.
    control_one = (bend_x + (end_x - bend_x) * 0.55, start_y)
    control_two = (bend_x + (end_x - bend_x) * 0.45, end_y)
    curve_start = (bend_x, start_y)
    points = [start, curve_start]
    for step in range(1, 61):
        t = step / 60
        u = 1 - t
        x = u**3 * curve_start[0] + 3*u*u*t*control_one[0] + 3*u*t*t*control_two[0] + t**3*end_x
        y = u**3 * curve_start[1] + 3*u*u*t*control_one[1] + 3*u*t*t*control_two[1] + t**3*end_y
        points.append((x,y))
    draw.line(points, fill=navy, width=3)
    tip = points[-1] if direction == 'toward-process' else points[0]
    previous = points[-2] if direction == 'toward-process' else points[1]
    dx,dy=tip[0]-previous[0],tip[1]-previous[1]
    distance=math.hypot(dx,dy)
    dx,dy=dx/distance,dy/distance
    head=[tip,(tip[0]-17*dx+8*dy,tip[1]-17*dy-8*dx),(tip[0]-17*dx-8*dy,tip[1]-17*dy+8*dx)]
    draw.polygon(head,fill=navy)
    svg.append(f'<path d="M{start_x},{start_y} H{bend_x} C{control_one[0]},{control_one[1]} {control_two[0]},{control_two[1]} {end_x},{end_y}" fill="none" stroke="{navy}" stroke-width="3"/>')
    svg.append('<polygon points="'+' '.join(f'{x:.2f},{y:.2f}' for x,y in head)+f'" fill="{navy}"/>')
    text(label_x,start_y-20,label)

text(W//2,65,'RoadToSchool - System Context Diagram',True,38)
process_w,process_h=650,650
process_x,process_y=(W-process_w)//2,(H-process_h)//2
box(process_x,process_y,process_w,process_h,True)
text(W//2,H//2-85,'0',True)
text(W//2,H//2,'ROAD TO SCHOOL',True)
text(W//2,H//2+55,'SYSTEM',True)
left_total=sum(len(flows) for _,flows in humans)
flow_index=0
for index,(name,flows) in enumerate(humans):
    y=230+index*450
    box(100,y,420,345)
    text(310,y+172,name,True)
    for i,(direction,label) in enumerate(flows):
        yy=y+35+i*55
        target_y=process_y+35+flow_index*(process_h-70)/(left_total-1)
        connected_flow((530,yy),(process_x-7,target_y),1150,label,840,'toward-process' if direction=='in' else 'away-from-process')
        flow_index+=1
right_total=sum(len(flows) for _,flows in providers)
flow_index=0
for index,(name,flows) in enumerate(providers):
    y=[280,990,1600,2100][index]
    h=max(220,len(flows)*55+25)
    box(2960,y,440,h)
    text(3180,y+h//2,name,True)
    for i,(direction,label) in enumerate(flows):
        yy=y+35+i*55
        target_y=process_y+35+flow_index*(process_h-70)/(right_total-1)
        connected_flow((2952,yy),(process_x+process_w+7,target_y),2350,label,2660,'away-from-process' if direction=='out' else 'toward-process')
        flow_index+=1
svg.append('</svg>')
image.save(out/'system-context-diagram-en.png')
(out/'system-context-diagram-en.svg').write_text('\n'.join(svg),encoding='utf-8')
flows=[{'entity':name,'flows':f} for name,f in humans+providers]
Path('output/context-diagram-detailed-flows.json').write_text(json.dumps(flows,indent=2),encoding='utf-8')
print(sum(len(f) for _,f in humans+providers),'directional data flows')
