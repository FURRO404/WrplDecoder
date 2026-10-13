# WrplDecoder

A hex viewer for War Thunder replay files (`.wrpl`) that runs in the browser: **https://furro404.github.io/WrplDecoder/**

Open a replay (or all parts of a server replay, or download one by session id) and click any byte to see what it is: header field, packet framing, MPI message, field, or a known value. Bytes with no known meaning stay plain. When you work out what a range means, save it as an annotation; it then applies to every packet of that kind. The shared annotations live in `annotations.json`; export yours and open a pull request to add them.

Files stay in your browser. To run it locally: `python3 -m http.server`, then open http://localhost:8000/.

Similar to [wrpl-inspector](https://github.com/maxsupermanhd/wrpl-inspector) by maxsupermanhd, a Go library and desktop GUI for the same format. WrplDecoder is smaller and focused on finding and recording what unknown bytes mean.

zstd decoding by [fzstd](https://github.com/101arrowz/fzstd) (MIT).
