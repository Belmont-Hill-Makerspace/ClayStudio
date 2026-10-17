# Clay Studio

**Design ceramic pieces in your browser and print them on the Eazao Potter X-1 clay printer.**

👉 **Open Clay Studio:** https://Belmont-Hill-Makerspace.github.io/ClayStudio/

Clay Studio is a single web page. There's nothing to install and no account to make. Pick a starting shape, adjust it with sliders and a drawn side profile, add your initials to the foot, and save a print file. Everything runs in your own browser, and no designs or personal information are sent anywhere.

> ⚠️ **For the Eazao Potter X-1 clay printer only.**
> Print files (`.gcode`) from Clay Studio are set up for this printer's 167 × 167 mm plate, clay nozzle and settings. Don't run them on any other printer.

## What you can make

| Shape | About (after firing) |
| --- | --- |
| Espresso cup | 62 mm wide, 55 mm tall |
| Cappuccino cup | 100 mm wide, 65 mm tall |
| Tumbler | 75 mm wide, 95 mm tall |
| Bowl | 105 mm wide, 40 mm tall |
| Pouring cup | Teardrop cup with a spout and a sloped rim |
| Tealight holder | 8-point star, fits a standard tealight |
| Star vase | 90 mm wide, 150 mm tall, twisted |
| Tulip vase | 90 mm wide, 130 mm tall, fluted, with a wavy rim |
| Ornament | 65 mm wide, 70 mm tall, twisted star |

Surface patterns include vertical ribs, spiral ribs, diamonds and bubbles. Which ones are offered depends on the shape.

Every shape has built-in limits that keep designs printable. If a change would make the wall lean too far for wet clay, the page says so in plain language and the save button turns off until the shape is adjusted.

## How to use it

1. Open the link above in Safari, Chrome or Edge.
2. Choose a starting shape at the top.
3. Adjust the size, side shape, surface pattern and rim. The 3D view updates as you go. Use **Undo** or **Start over** if you need to.
4. Optionally, add up to 3 initials for the bottom.
5. When the bar under the picture says **Ready to print**, click **Save the print file**.
6. Copy the `.gcode` file to the printer's SD card, load the clay barrel, and start the print from the printer.

The bar under the picture also shows the print time, the amount of clay, and how many pieces like it one barrel makes.

## After printing

- Leave the piece on the plate until it firms up, then cut it free with a wire.
- Dry, bisque and glaze as normal.
- Keep glaze off the foot so the initials stay crisp.
- Sizes on the page are after firing. Prints are made larger while wet to allow for about 12% shrinkage.

## For teachers or advanced users

**Advanced settings** at the bottom of the page unlock every shape option, the clay printer settings (including clay flow and shrinkage), and STL export for plastic printers. Safety limits become warnings only. It asks for a code. Ask the makerspace for it, and turn advanced settings off again before handing a computer back to a student.

## Working offline

The page is one self-contained file. If the internet is down, download `index.html`, then double-click it to open it in a browser. Everything works the same, except the page uses the system font instead of its usual typeface.

## Updating the site

Upload a new `index.html` to this repository, replacing the old one, and commit. GitHub Pages updates the site within a couple of minutes, and the link stays the same.

## Credits

- 3D view by [three.js](https://threejs.org/) (MIT License). Its license notice is kept inside `index.html`.
- Typeface: [Atkinson Hyperlegible](https://fonts.google.com/specimen/Atkinson+Hyperlegible) by the Braille Institute, loaded from Google Fonts (SIL Open Font License).
- Print settings are based on Eazao's own profiles for the Potter X-1.
