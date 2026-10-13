# WrplDecoder

A hex viewer for War Thunder replay files (`.wrpl`) that runs in the browser: **https://furro404.github.io/WrplDecoder/**

Open a replay (or all parts of a server replay, or download one by session id) and click any byte to see what it is: header field, packet framing, MPI message, field, or a known value. Some variable structures are decoded record by record: ground vehicle sync 0xF074 (with the delta-compressed vehicle state: position, velocity, turret angles, tracks, ammo), store sync 0xF11A, aircraft ground contacts 0xD048, binary DataBlocks in 0xF0DF and 0xF0EC, terraform 0xF122/0xF123, reflection data 0xF02D/0xF0AA/0xD136, and the ECS message class names of packet type 6. Bytes with no known meaning stay plain. When you work out what a range means, save it as an annotation; it then applies to every packet of that kind. The shared annotations live in `annotations.json`; export yours and open a pull request to add them.

Files stay in your browser. To run it locally: `python3 -m http.server`, then open http://localhost:8000/.

Similar to [wrpl-inspector](https://github.com/maxsupermanhd/wrpl-inspector) by maxsupermanhd, a Go library and desktop GUI for the same format. WrplDecoder is smaller and focused on finding and recording what unknown bytes mean. These features follow wrpl-inspector's ideas:

- download a server replay by session id, and open all its parts as one replay
- plot one value of a packet kind over the battle time (its byte interpreter)
- shift the selected bytes by 0-7 bits (its bit shift tab)
- filter packets by a hex pattern of the payload, and count packets per MPI id

Much of the container and packet framing knowledge also comes from its research.

zstd decoding by [fzstd](https://github.com/101arrowz/fzstd) (MIT).
