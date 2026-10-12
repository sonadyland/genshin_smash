"""Register approved Xiao v6 atlases without modifying any image pixels.

The alpha-derived crop rectangles use observed gaps, not an assumed uniform grid.
Body-feature correspondence transfers the original virtual support points;
L uses its measured spear tip as the physical-floor registration point.
Existing phase/timing stays intact.
"""
from __future__ import annotations
import copy
import hashlib
import json
from pathlib import Path
from statistics import median
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / "public/assets/animations/xiao-v4"
NEW = ROOT / "public/assets/animations/xiao-v6"
LAYOUT = {
    "locomotion": ([0,420,750,1086], [[0,380,745,1100,1448]]*3),
    "aerial": ([0,420,770,1087], [[0,380,740,1100,1447]]*3),
    "basic": ([0,410,670,950,1254], [[0,345,650,965,1254],[0,355,655,960,1254],[0,340,635,965,1254],[0,350,645,935,1254]]),
    "basic-variants": ([0,350,645,950,1254], [[0,330,650,985,1254]]*4),
    "special": ([0,380,742,1087], [[0,365,720,1075,1447]]*3),
    "secondary": ([0,420,740,1087], [[0,395,765,1120,1447]]*3),
}
SOURCES = {
 "locomotion":"exec-2db5c553-9159-4338-8b2a-d9e8cfb55219.png",
 "aerial":"exec-3bb48e3b-5083-4428-bf6f-f7c09c86d305.png",
 "basic":"exec-f455b6bb-12b6-48c3-b68e-269303d7b3b2.png",
 "basic-variants":"exec-6a39aaf0-63d7-406c-9091-53cf40e36a4a.png",
 "special":"exec-3ea54385-9034-4f64-a898-e750306a8df1.png",
 "secondary":"exec-a1bb5732-3429-4aca-87a5-59ce629aea79.png",
}

def measure(name: str) -> tuple[Image.Image,list[dict]]:
    image = Image.open(NEW / (name + ".png"))
    assert image.mode == "RGBA"
    ys, rows = LAYOUT[name]
    frames = []
    for row, xs in enumerate(rows):
        for col in range(4):
            zone = (xs[col],ys[row],min(xs[col+1],image.width),min(ys[row+1],image.height))
            alpha = image.getchannel("A").crop(zone)
            visible = alpha.point(lambda a:255 if a >= 8 else 0).getbbox()
            assert visible
            bounds = tuple(visible[i] + zone[i%2] for i in range(4))
            rect = (max(zone[0],bounds[0]-8),max(zone[1],bounds[1]-8),
                    min(zone[2],bounds[2]+8),min(zone[3],bounds[3]+8))
            rgba = image.crop(rect)
            opaque = rgba.getchannel("A").point(lambda a:255 if a>=128 else 0).getbbox()
            assert opaque
            gutter = min(opaque[0],opaque[1],rgba.width-opaque[2],rgba.height-opaque[3])
            assert gutter>=1,(name,row,col,"clipped opaque pixel",gutter)
            frames.append({"rect":rect,"zone":zone,"gutter":gutter,
                           "rgbaSha256":hashlib.sha256(rgba.tobytes()).hexdigest()})
    return image,frames

def tip(image: Image.Image, rect: tuple[int,...], down: bool) -> tuple[int,int]:
    pixels = image.load()
    points = []
    for y in range(rect[1],rect[3]):
        for x in range(rect[0],rect[2]):
            r,g,b,a = pixels[x,y]
            if a>=64 and g>60 and g>r*1.08 and g>b*0.88:
                points.append((x,y))
    assert points
    axis = 1 if down else 0
    outer = max(p[axis] for p in points)
    edge = [p for p in points if p[axis] == outer]
    return (round(median(p[0] for p in edge)),outer) if down else (outer,round(median(p[1] for p in edge)))

def body_correspondence(before: Image.Image, after: Image.Image):
    """Transfer the old virtual support through actual matching body details.

    OpenCV contracts: https://docs.opencv.org/4.x/d1/de0/tutorial_py_feature_homography.html
    https://docs.opencv.org/4.x/d9/d0c/group__calib3d.html
    This measures only. It never resamples or writes a raster.
    """
    def features(image, detector):
        pixels = np.asarray(image).copy()
        mask = pixels[:,:,3] >= 128
        rgb = pixels[:,:,:3].copy()
        rgb[~mask] = 0
        return detector.detectAndCompute(cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY),mask.astype('uint8')*255)
    for contrast in (.015,.006,.025):
        detector = cv2.SIFT_create(contrastThreshold=contrast)
        old_keys, old_descriptors = features(before,detector)
        new_keys, new_descriptors = features(after,detector)
        matches = cv2.BFMatcher().knnMatch(old_descriptors,new_descriptors,k=2)
        # The redrawn dodge-travel body needs the .80 fallback; its seven
        # verified inliers sit on cloak, waist and bent leg, never the spear.
        for ratio in (.72,.75,.78,.80):
            good = [pair[0] for pair in matches if len(pair)==2 and pair[0].distance < ratio*pair[1].distance]
            if len(good)<8:
                continue
            source=np.float32([old_keys[m.queryIdx].pt for m in good])
            target=np.float32([new_keys[m.trainIdx].pt for m in good])
            cv2.setRNGSeed(0)
            matrix,inliers=cv2.estimateAffinePartial2D(source,target,method=cv2.RANSAC,ransacReprojThreshold=3,maxIters=5000)
            if matrix is None or int(inliers.sum())<7:
                continue
            scale=float(np.hypot(matrix[0,0],matrix[1,0]))
            error=np.linalg.norm(source@matrix[:,:2].T+matrix[:,2]-target,axis=1)
            median_error=float(np.median(error[inliers[:,0]==1]))
            if .5<scale<1.6 and median_error<1.5:
                return matrix,scale,int(inliers.sum()),median_error
    raise AssertionError('Insufficient reliable Xiao body correspondences')

def main() -> None:
    original = json.loads((OLD/"manifest.json").read_text(encoding="utf-8"))
    manifest = copy.deepcopy(original)
    manifest.update({"generator":"built-in image_gen","date":"2026-10-12",
        "revision":"xiao-v6-weapon-grip","registrationNotes":
        "Weapon-only portrait-matched repair; 80 frame names, phases, durations and trails preserved. PNGs are native image_gen outputs, never raster-edited by this script."})
    measured = {name:measure(name) for name in LAYOUT}
    mapping = {
        ("clips","idle"):("locomotion",0),("clips","run"):("locomotion",4),
        ("clips","jump"):("aerial",0),("clips","dodge"):("aerial",8),
        ("clips","jab"):("basic",0),("clips","smash"):("basic",8),
        ("clips","special"):("special",0),("clips","secondary"):("secondary",0),
        ("variants","jab"):("basic-variants",0),("variants","smash"):("basic-variants",8),
    }
    reports=[]
    total=0
    for (group,key),(name,offset) in mapping.items():
        clip=manifest[group][key]
        image, measurements=measured[name]
        clip.update({"image":name+".png","width":image.width,"height":image.height})
        original_clip=original[group][key]
        original_image=Image.open(OLD/original_clip["image"])
        anatomical_scales=[]
        for index,frame in enumerate(clip["frames"]):
            physical_index=offset+index
            measured_frame=measurements[physical_index]
            x,y,right,bottom=measured_frame["rect"]
            old_frame=original_clip["frames"][index]
            prior=old_frame["sourceRect"]
            ox,oy,ow,oh=(prior[k] for k in ("x","y","width","height"))
            try:
                matrix,body_scale,matches,body_error=body_correspondence(original_image.crop((ox,oy,ox+ow,oy+oh)),image.crop((x,y,right,bottom)))
            except AssertionError as error:
                raise AssertionError((group,key,index,str(error))) from error
            anatomical_scales.append(body_scale)
            frame.pop("sourceScale",None)
            if key=="special":
                mark=tip(image,measured_frame["rect"],True)
                support=mark
            else:
                transferred=matrix@np.array([old_frame["footAnchor"]["x"]*ow,old_frame["footAnchor"]["y"]*oh,1])
                support=(float(transferred[0]+x),float(transferred[1]+y))
                mark=tip(image,measured_frame["rect"],False) if "weaponTip" in frame else None
                zone=measured_frame["zone"]
                x=max(zone[0],min(x,int(np.floor(support[0]))-5))
                y=max(zone[1],min(y,int(np.floor(support[1]))-5))
                right=min(zone[2],max(right,int(np.ceil(support[0]))+5))
                bottom=min(zone[3],max(bottom,int(np.ceil(support[1]))+5))
            width,height=right-x,bottom-y
            frame["sourceRect"]={"x":x,"y":y,"width":width,"height":height}
            assert x<=support[0]<=right and y<=support[1]<=bottom,(name,physical_index,support,(x,y,right,bottom))
            frame["footAnchor"]={"x":round((support[0]-x)/width,8),"y":round((support[1]-y)/height,8)}
            if mark is not None:
                frame["weaponTip"]={"x":mark[0]-x,"y":mark[1]-y}
                assert 0<=frame["weaponTip"]["x"]<=width and 0<=frame["weaponTip"]["y"]<=height
            assert all(frame.get(k)==old_frame.get(k) for k in ("name","phase","duration"))
            final_rgba=image.crop((x,y,right,bottom))
            opaque=final_rgba.getchannel("A").point(lambda a:255 if a>=128 else 0).getbbox()
            final_gutter=min(opaque[0],opaque[1],width-opaque[2],height-opaque[3])
            reports.append({"clip":key,"variant":group=="variants","frame":index,
                "image":name+".png","sourceRect":frame["sourceRect"],
                "supportGlobal":list(support),"weaponTipGlobal":list(mark) if mark else None,
                "minimumOpaqueGutterPx":final_gutter,
                "bodyScale":round(body_scale,6),"bodyMatches":matches,"medianBodyErrorPx":round(body_error,4),
                "rgbaSha256":hashlib.sha256(final_rgba.tobytes()).hexdigest()})
            total+=1
        assert clip.get("trail")==original[group][key].get("trail")
        clip["standingBodyHeightPixels"]=round(original_clip["standingBodyHeightPixels"]*median(anatomical_scales),4)
        filename=key+("-alternate" if group=="variants" else "")+".json"
        (NEW/filename).write_text(json.dumps(clip,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    assert total==80
    (NEW/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    report={"ok":True,"character":"xiao","pack":"xiao-v6","frames":total,
        "timingAndPhasesUnchanged":True,"nativeRasterUnmodified":True,
        "clipStandingBodyHeightPixels":{group:{key:clip["standingBodyHeightPixels"] for key,clip in manifest[group].items()} for group in ("clips","variants")},
        "atlases":[{"image":name+".png","generatedSource":SOURCES[name],
             "size":list(image.size),
             "bytes":(NEW/(name+".png")).stat().st_size,
             "sha256":hashlib.sha256((NEW/(name+".png")).read_bytes()).hexdigest(),
             "transparentPercent":round(100*image.getchannel("A").histogram()[0]/(image.width*image.height),2)}
             for name,(image,_) in measured.items()],
        "registration":reports}
    (ROOT/"docs/xiao-v6-art-validation.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"ok":True,"frames":total,"minGutter":min(f["minimumOpaqueGutterPx"] for f in reports),
        "MiB":round(sum(a["bytes"] for a in report["atlases"])/1048576,2),
        "specialTipError":max(abs(f["footAnchor"]["x"]*f["sourceRect"]["width"]-f["weaponTip"]["x"])+abs(f["footAnchor"]["y"]*f["sourceRect"]["height"]-f["weaponTip"]["y"]) for f in manifest["clips"]["special"]["frames"])}))
if __name__=="__main__":
    main()
