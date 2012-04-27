(function() {

  window.MP.Mod = (function() {

    Mod.prototype.NOTES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-', 'B#'];

    Mod.prototype.atos = function(a) {
      var s;
      return s = String.fromCharCode.apply(String, a).replace(/\x00/g, '');
    };

    Mod.prototype.signed_nybble = function(a) {
      if (a >= 8) {
        return a - 16;
      } else {
        return a;
      }
    };

    Mod.prototype.note_from_text = function(note) {
      var oct;
      if (note === 0) return "---";
      oct = Math.floor((note - 1) / 12);
      return this.NOTES[(note - 1) % 12] + oct;
    };

    Mod.prototype.find_note = function(period) {
      var bestd, d, i, note;
      note = 0;
      bestd = Math.abs(period - window.MP.constants.BASE_PTABLE[0]);
      if (period) {
        for (i = 1; i <= 60; i++) {
          d = Math.abs(period - window.MP.constants.BASE_PTABLE[i]);
          if (d < bestd) {
            bestd = d;
            note = i;
          }
        }
      }
      return note;
    };

    function Mod(data, callback) {
      if (data.byteLength) {
        this.from_array_buffer(data);
      } else {
        this.from_json(data);
      }
      if (typeof callback === 'function') _.defer(callback);
    }

    Mod.prototype.from_array_buffer = function(data) {
      var c, i, note, offset, p, pattern, pattern_data, s, sample, sample_data, step, subdata, _i, _len, _ref, _ref2, _results;
      this.samples = [];
      this.patterns = [];
      subdata = new Uint8Array(data, 1080, 4);
      if (this.atos(subdata) === 'M.K.') {
        this.name = this.atos(new Uint8Array(data, 0, 20));
        for (i = 0; i <= 30; i++) {
          sample = {};
          sample.name = this.atos(new Uint8Array(data, 20 + (30 * i), 22));
          sample_data = new Uint8Array(data, 20 + (30 * i) + 22, 8);
          sample.length = ((sample_data[0] << 8) + sample_data[1]) * 2;
          sample.finetune = this.signed_nybble(sample_data[2] & 0x0F);
          sample.raw_finetune = sample_data[2] & 0x0F;
          sample.volume = sample_data[3];
          sample.repeat = ((sample_data[4] << 8) + sample_data[5]) * 2;
          sample.replen = ((sample_data[6] << 8) + sample_data[7]) * 2;
          this.samples.push(sample);
        }
        pattern_data = new Uint8Array(data, 950, 2);
        this.pattern_table_length = pattern_data[0];
        this.pattern_table = new Uint8Array(data, 952, 128);
        this.num_patterns = _.max(this.pattern_table);
        for (p = 0, _ref = this.num_patterns; 0 <= _ref ? p <= _ref : p >= _ref; 0 <= _ref ? p++ : p--) {
          pattern = [];
          pattern_data = new Uint8Array(data, 1084 + (p * 1024), 1024);
          for (s = 0; s <= 63; s++) {
            step = [];
            for (c = 0; c <= 3; c++) {
              note = {};
              note.raw_data = [pattern_data[(s * 16) + (c * 4)], pattern_data[(s * 16) + (c * 4) + 1], pattern_data[(s * 16) + (c * 4) + 2], pattern_data[(s * 16) + (c * 4) + 3]];
              note.period = ((pattern_data[(s * 16) + (c * 4)] & 0x0F) << 8) + (pattern_data[(s * 16) + (c * 4) + 1] & 0xF0) + (pattern_data[(s * 16) + (c * 4) + 1] & 0x0F);
              note.note = this.find_note(note.period);
              note.note_text = this.note_from_text(note.note);
              note.sample = (pattern_data[(s * 16) + (c * 4)] & 0xF0) + ((pattern_data[(s * 16) + (c * 4) + 2] & 0xF0) >> 4);
              note.command = pattern_data[(s * 16) + (c * 4) + 2] & 0x0F;
              note.command_params = (pattern_data[(s * 16) + (c * 4) + 3] & 0xF0) + (pattern_data[(s * 16) + (c * 4) + 3] & 0x0F);
              note.hex_command_params = note.command_params.toString(16);
              step.push(note);
            }
            pattern.push(step);
          }
          this.patterns.push(pattern);
        }
        offset = 1084 + ((this.num_patterns + 1) * 1024);
        _ref2 = this.samples;
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          sample = _ref2[_i];
          sample.data = new Int8Array(data, offset, sample.length);
          _results.push(offset += sample.length);
        }
        return _results;
      } else {
        throw 'Invalid Module Data';
      }
    };

    return Mod;

  })();

}).call(this);
