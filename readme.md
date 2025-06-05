Some JS parsers for Tanki maps and related formats
Not ready and there's no new info
Current functionality:
- dump geometry in .obj format (`node nodetest.js map_file >> res.obj`)
Currently supported formats:
- maps: (no sprites)
-- .bin
-- .xml v1/v2
-- .xml v3 (geometry only)
- proplib metadata:
-- .xml
-- .json
-- .tara/.xml
- models: (no smooth group data, no norms)
-- .3ds (technically just subset of 3ds as it doesn't parses all of it)
-- .a3d v2
./structs contains some info about what a parser must spit out