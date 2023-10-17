# halfplayer

A simple mod player for protracker modules. Player routine converted from Tammos TinyMod.cpp

## License

Licensed under MIT License. See [LICENSE](LICENSE).

## 2023 fixes

I've made these changes directly in the JavaScript files. At one point I'll try to convert it to proper modern JavaScript
but today is not that day. This should probably also work completely in an audio worker.

- removed monkeypatch from cwilso (no longer needed)
- added a .resume() call to work around the "needs to be started on user interaction" 
- Added another mod as a testcase as I am comparing stuff to [protracktor](https://github.com/retracktor/protracktor)