import sys
from PIL import Image

def make_transparent(img_path, out_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        for item in datas:
            # Check if pixel is close to white (255, 255, 255)
            # If r, g, b are all high, we make it transparent
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        img.save(out_path, "PNG")
        print("Success")
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    make_transparent(sys.argv[1], sys.argv[2])
