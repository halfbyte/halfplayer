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

    Mod.prototype.set_sample_hi = function(p, r, c, n) {
      return this.patterns[p][r][c].sample = ((n & 1) << 4) | (this.patterns[p][r][c].sample & 0xf);
    };

    Mod.prototype.set_sample_lo = function(p, r, c, n) {
      return this.patterns[p][r][c].sample = (this.patterns[p][r][c].sample & 0xf0) | (n & 0xf);
    };

    Mod.prototype.set_command = function(p, r, c, n) {
      return this.patterns[p][r][c].command = n & 0xF;
    };

    Mod.prototype.set_command_param_hi = function(p, r, c, n) {
      return this.patterns[p][r][c].command_params = ((n & 0xF) << 4) | (this.patterns[p][r][c].command_params & 0xf);
    };

    Mod.prototype.set_command_param_lo = function(p, r, c, n) {
      return this.patterns[p][r][c].command_params = (this.patterns[p][r][c].command_params & 0xf0) | (n & 0xf);
    };

    Mod.prototype.set_volume = function(sample, volume) {
      if (volume >= 0 && volume <= 64) return this.samples[sample].volume = volume;
    };

    Mod.prototype.volume_up = function(sample) {
      return this.set_volume(sample, this.samples[sample].volume + 1);
    };

    Mod.prototype.volume_down = function(sample) {
      return this.set_volume(sample, this.samples[sample].volume - 1);
    };

    Mod.prototype.set_finetune = function(sample, finetune) {
      if (finetune >= -8 && finetune <= 7) {
        this.samples[sample].finetune = finetune;
      }
      return console.log(this.samples[sample].finetune);
    };

    Mod.prototype.finetune_up = function(sample) {
      return this.set_finetune(sample, this.samples[sample].finetune + 1);
    };

    Mod.prototype.finetune_down = function(sample) {
      return this.set_finetune(sample, this.samples[sample].finetune - 1);
    };

    Mod.prototype.set_note = function(pattern, row, channel, note, sample) {
      this.patterns[pattern][row][channel].note = note;
      this.patterns[pattern][row][channel].note_text = this.note_from_text(note);
      return this.patterns[pattern][row][channel].sample = sample + 1;
    };

    Mod.prototype.delete_note = function(pattern, row, channel) {
      this.patterns[pattern][row][channel].note = 0;
      this.patterns[pattern][row][channel].note_text = '---';
      return this.patterns[pattern][row][channel].sample = 0;
    };

    function Mod(data, callback) {
      if (data.byteLength) {
        this.from_array_buffer(data);
      } else {
        this.from_json(data);
      }
      if (typeof callback === 'function') _.defer(callback);
    }

    Mod.prototype.base64ToInt8 = function(input) {
      var bs, i, out, _ref;
      bs = atob(input);
      out = new Int8Array(bs.length);
      for (i = 0, _ref = bs.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        out[i] = bs.charCodeAt(i);
      }
      return out;
    };

    Mod.prototype.int8ToBase64 = function(input) {
      var i, out, _ref;
      out = "";
      for (i = 0, _ref = input.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        out += String.fromCharCode((input[i] + 256) % 256);
      }
      return btoa(out);
    };

    Mod.prototype.add_pattern = function() {
      var notenum, pattern, row, rownum;
      pattern = [];
      for (rownum = 0; rownum <= 63; rownum++) {
        row = [];
        for (notenum = 0; notenum <= 3; notenum++) {
          row[notenum] = {
            note: 0,
            period: 0,
            note_text: '---',
            command: 0,
            command_params: 0
          };
        }
        pattern[rownum] = row;
      }
      this.patterns[this.num_patterns] = pattern;
      return this.num_patterns++;
    };

    Mod.prototype.from_json = function(data) {
      var callbacks, i, sample, _len, _ref, _results;
      console.log("loading json");
      this.name = data.name;
      this.samples = data.samples;
      this.patterns = data.patterns;
      this.fix_patterns();
      this.pattern_table_length = data.pattern_table_length;
      this.pattern_table = data.pattern_table;
      this.num_patterns = data.patterns.length;
      callbacks = [];
      _ref = this.samples;
      _results = [];
      for (i = 0, _len = _ref.length; i < _len; i++) {
        sample = _ref[i];
        if (sample.length > 0) {
          _results.push(sample.data = this.base64ToInt8(data.sample_data[i]));
        } else {
          _results.push(sample.data = []);
        }
      }
      return _results;
    };

    Mod.prototype.fix_patterns = function() {
      var note, pattern, row, _i, _len, _ref, _results;
      _ref = this.patterns;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pattern = _ref[_i];
        _results.push((function() {
          var _j, _len2, _results2;
          _results2 = [];
          for (_j = 0, _len2 = pattern.length; _j < _len2; _j++) {
            row = pattern[_j];
            _results2.push((function() {
              var _k, _len3, _results3;
              _results3 = [];
              for (_k = 0, _len3 = row.length; _k < _len3; _k++) {
                note = row[_k];
                note.note = this.find_note(note.period);
                _results3.push(note.note_text = this.note_from_text(note.note));
              }
              return _results3;
            }).call(this));
          }
          return _results2;
        }).call(this));
      }
      return _results;
    };

    Mod.prototype.as_json = function() {
      var sample;
      return {
        name: this.name,
        samples: (function() {
          var _i, _len, _ref, _results;
          _ref = this.samples;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            sample = _ref[_i];
            _results.push({
              name: sample.name,
              length: sample.length,
              repeat: sample.repeat,
              replen: sample.replen,
              finetune: sample.finetune,
              volume: sample.volume
            });
          }
          return _results;
        }).call(this),
        pattern_table_length: this.pattern_table_length,
        pattern_table: this.pattern_table,
        patterns: this.patterns,
        sample_data: (function() {
          var _i, _len, _ref, _results;
          _ref = this.samples;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            sample = _ref[_i];
            _results.push(this.int8ToBase64(sample.data));
          }
          return _results;
        }).call(this)
      };
    };

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
