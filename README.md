gl-error2d
==========
Error bars for 2D scatter plots

#### `var error2d = require('gl-error2d')(plot, options)`

Option | Meaning
---|---
`positions` | Array with points `[x0,y0, x1,y1, ..., xn,yn]`
`errors` | Array with errors `[e0l,e0r,e0b,e0t, e1l,e1r,e1b,e1t, ...]`
`color` | Array with channel values `[0, .2, .5, 1]`
`lineWidth` | Error bar width, `1`
`capSize` | Error bar cap size, `5`

# License
(c) 2015 Mikola Lysenko. MIT License
