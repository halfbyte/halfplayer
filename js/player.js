(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.MP.player.clamp = function(x, min, max) {
    return Math.max(min, Math.min(max, x));
  };

  window.MP.player.MixerVoice = (function() {

    function MixerVoice() {
      this.sample_len = 0;
      this.loop_len = 0;
      this.period = 65535;
      this.volume = 0;
      this.pos = 0.0;
      this.sample = null;
    }

    MixerVoice.prototype.render = function(buffer, offset, samples) {
      var i, int_pos, inv_fac, next_fac, next_pos, sample, _results;
      if (!this.sample) return;
      _results = [];
      for (i = 0; 0 <= samples ? i < samples : i > samples; 0 <= samples ? i++ : i--) {
        this.pos += (3740000.0 / this.period) / 48000.0;
        int_pos = Math.floor(this.pos);
        if (int_pos >= this.sample_len) {
          this.pos -= this.loop_len;
          int_pos -= this.loop_len;
        }
        next_pos = int_pos + 1;
        if (next_pos >= this.sample_len) next_pos -= this.loop_len;
        next_fac = this.pos - Math.floor(this.pos);
        inv_fac = 1.0 - next_fac;
        sample = this.sample[int_pos] * inv_fac + this.sample[next_pos] * next_fac;
        _results.push(buffer[i + offset] += (sample / 128.0 * (this.volume / 64.0)) * 0.5);
      }
      return _results;
    };

    MixerVoice.prototype.trigger = function(sample, len, loop_len, offset) {
      this.sample = sample;
      this.sample_len = len;
      this.loop_len = loop_len;
      return this.pos = Math.min(offset, this.sample_len - 1);
    };

    return MixerVoice;

  })();

  window.MP.player.Mixer = (function() {

    Mixer.prototype.PAULARATE = 3740000;

    Mixer.prototype.OUTRATE = 48000;

    function Mixer() {
      var i;
      this.voices = [];
      for (i = 0; i <= 3; i++) {
        this.voices.push(new window.MP.player.MixerVoice());
      }
      this.master_volume = 0.66;
      this.master_separation = 0.5;
    }

    Mixer.prototype.render = function(l_buf, r_buf, offset, samples) {
      var ch, _results;
      _results = [];
      for (ch = 0; ch <= 3; ch++) {
        if (ch === 1 || ch === 2) {
          _results.push(this.voices[ch].render(l_buf, offset, samples));
        } else {
          _results.push(this.voices[ch].render(r_buf, offset, samples));
        }
      }
      return _results;
    };

    return Mixer;

  })();

  window.MP.player.Channel = (function() {

    function Channel(player) {
      this.player = player;
      this.note = 0;
      this.period = 0;
      this.fxbuf = new Int16Array(16);
      this.fxbuf_14 = new Int16Array(16);
      this.sample = 0;
      this.finetune = 0;
      this.volume = 0;
      this.loopstart = 0;
      this.loopcount = 0;
      this.retrig_count = 0;
      this.vib_wave = 0;
      this.vib_retr = 0;
      this.vib_pos = 0;
      this.vib_ampl = 0;
      this.vib_speed = 0;
      this.trem_wave = 0;
      this.trem_retr = 0;
      this.trem_pos = 0;
      this.trem_ampl = 0;
      this.trem_speed = 0;
    }

    Channel.prototype.to_unsigned = function(n) {
      if (n < 0) {
        return n + 16;
      } else {
        return n;
      }
    };

    Channel.prototype.get_period = function(offs, fineoffs) {
      var ft;
      if (offs == null) offs = 0;
      if (fineoffs == null) fineoffs = 0;
      ft = this.finetune + fineoffs;
      while (ft > 7) {
        offs++;
        ft -= 16;
      }
      while (ft < -8) {
        offs--;
        ft += 16;
      }
      if (this.note) {
        return this.player.PTABLE[this.to_unsigned(ft) & 0x0f][window.MP.player.clamp(this.note + offs - 1, 0, 59)];
      } else {
        return 0;
      }
    };

    Channel.prototype.set_period = function(offs, fineoffs) {
      if (offs == null) offs = 0;
      if (fineoffs == null) fineoffs = 0;
      if (this.note) return this.period = this.get_period(offs, fineoffs);
    };

    return Channel;

  })();

  window.MP.player.Player = (function() {

    function Player() {
      this.soundbridge_render = __bind(this.soundbridge_render, this);
      this.xaudio_render = __bind(this.xaudio_render, this);
      this.load_from_json = __bind(this.load_from_json, this);
      this.raf_callback = __bind(this.raf_callback, this);
      var i;
      this.module = null;
      this.channels = [];
      for (i = 0; i <= 3; i++) {
        this.channels.push(new window.MP.player.Channel(this));
      }
      this.mixer = new window.MP.player.Mixer();
      this.calc_ptable();
      this.calc_vibtable();
      this.bpm = 125;
      this.reset();
      this.cur_pos = 0;
      this.cur_pattern = 0;
      this.playing = false;
      this.audioserver = new XAudioServer(2, 48000, 48000 >> 2, 48000 << 1, this.xaudio_render, 1);
      window.AS = this.audioserver;
      window.requestAnimationFrame(this.raf_callback, null);
    }

    Player.prototype.raf_callback = function() {
      this.audioserver.executeCallback();
      return window.requestAnimationFrame(this.raf_callback, null);
    };

    Player.prototype.OUTRATE = 48000;

    Player.prototype.OUTFPS = 50;

    Player.prototype.channels = [];

    Player.prototype.speed = 0;

    Player.prototype.tick_rate = 0;

    Player.prototype.tr_counter = 0;

    Player.prototype.cur_tick = 0;

    Player.prototype.cur_row = 0;

    Player.prototype.delay = 0;

    Player.prototype.load_from_json = function(json, callback) {
      var finished;
      finished = function() {
        return callback();
      };
      return this.module = new window.MP.models.Mod(json, finished);
    };

    Player.prototype.load_from_local_file = function(file, callback) {
      var reader,
        _this = this;
      reader = new FileReader();
      reader.onerror = function(evt) {
        return callback(evt);
      };
      reader.onloadend = function(evt) {
        var result;
        if (evt.target.readyState === FileReader.DONE) {
          result = evt.target.result;
          _this.module = new window.MP.models.Mod(result);
          _this.reset();
          return callback();
        }
      };
      reader.readAsArrayBuffer(file);
      return "LOADING " + file;
    };

    Player.prototype.set_module = function(mod) {
      this.module = mod;
      return this.reset();
    };

    Player.prototype.play = function() {
      this.playing = true;
      this.pattern_only = false;
      return this.cur_row = 0;
    };

    Player.prototype.play_pattern = function(pattern) {
      this.cur_pattern = pattern;
      this.pattern_only = true;
      this.playing = true;
      return this.cur_row = 0;
    };

    Player.prototype.stop = function() {
      var ch, _results;
      this.playing = false;
      _results = [];
      for (ch = 0; ch <= 3; ch++) {
        this.mixer.voices[ch].volume = 0;
        _results.push(this.channels[ch].volume = 0);
      }
      return _results;
    };

    Player.prototype.xaudio_render = function(len) {
      var buffer, i, l_buf, r_buf;
      buffer = new Float32Array(len * 2);
      l_buf = new Float32Array(len);
      r_buf = new Float32Array(len);
      this.render(l_buf, r_buf, len);
      for (i = 0; 0 <= len ? i < len : i > len; 0 <= len ? i++ : i--) {
        buffer[i * 2] = l_buf[i];
        buffer[i * 2 + 1] = r_buf[i];
      }
      return buffer;
    };

    Player.prototype.soundbridge_render = function(bridge, length, channels) {
      var i, l_buf, r_buf, _results;
      l_buf = new Float32Array(length);
      r_buf = new Float32Array(length);
      this.render(l_buf, r_buf, length);
      _results = [];
      for (i = 0; 0 <= length ? i < length : i > length; 0 <= length ? i++ : i--) {
        _results.push(bridge.addToBuffer(l_buf[i], r_buf[i]));
      }
      return _results;
    };

    Player.prototype.calc_ptable = function() {
      var fac, ft, i, periods, rft;
      this.PTABLE = [];
      for (ft = 0; ft <= 16; ft++) {
        rft = -(ft >= 8 ? ft - 16 : ft);
        fac = Math.pow(2.0, rft / (12.0 * 16.0));
        periods = [];
        for (i = 0; i <= 59; i++) {
          periods.push(Math.round(window.MP.constants.BASE_PTABLE[i] * fac));
        }
        this.PTABLE.push(periods);
      }
      return this.PTABLE;
    };

    Player.prototype.calc_vibtable = function() {
      var ampl, i, scale, shift, x, _results;
      this.VIB_TABLE = [];
      for (i = 0; i <= 2; i++) {
        this.VIB_TABLE.push([]);
      }
      _results = [];
      for (ampl = 0; ampl <= 14; ampl++) {
        scale = ampl + 1.5;
        shift = 0;
        this.VIB_TABLE[0][ampl] = [];
        this.VIB_TABLE[1][ampl] = [];
        this.VIB_TABLE[2][ampl] = [];
        _results.push((function() {
          var _results2;
          _results2 = [];
          for (x = 0; x <= 63; x++) {
            this.VIB_TABLE[0][ampl].push(Math.floor(scale * Math.sin(x * Math.PI / 32.0) + shift));
            this.VIB_TABLE[1][ampl].push(Math.floor(scale * ((63 - x) / 31.5 - 1.0) + shift));
            _results2.push(this.VIB_TABLE[2][ampl].push(Math.floor(scale * (x < 32 ? 1 : -1) + shift)));
          }
          return _results2;
        }).call(this));
      }
      return _results;
    };

    Player.prototype.calc_tick_rate = function(bpm) {
      this.bpm = bpm;
      return this.tick_rate = (125 * this.OUTRATE) / (bpm * this.OUTFPS);
    };

    Player.prototype.trig_single_note = function(ch, sample, note) {
      var channel, offset, voice;
      channel = this.channels[ch];
      voice = this.mixer.voices[ch];
      sample = this.module.samples[sample];
      offset = 0;
      channel.note = note;
      channel.set_period();
      voice.period = channel.period;
      channel.volume = 64;
      voice.volume = 64;
      if (sample.replen > 2) {
        voice.trigger(sample.data, sample.repeat + sample.replen, sample.replen, offset);
      } else {
        voice.trigger(sample.data, sample.length, 1, offset);
      }
      channel.vib_pos = 0;
      return channel.trem_pos = 0;
    };

    Player.prototype.trig_note = function(ch, note) {
      var channel, offset, sample, voice;
      channel = this.channels[ch];
      voice = this.mixer.voices[ch];
      sample = this.module.samples[channel.sample - 1];
      offset = 0;
      if (note.command === 9) offset = channel.fxbuf[9] << 8;
      if (note.command !== 3 && note.command !== 5) {
        channel.set_period();
        if (sample.replen > 2) {
          voice.trigger(sample.data, sample.repeat + sample.replen, sample.replen, offset);
        } else {
          voice.trigger(sample.data, sample.length, 1, offset);
        }
        if (!channel.vib_retr) channel.vib_pos = 0;
        if (!channel.trem_retr) return channel.trem_pos = 0;
      }
    };

    Player.prototype.reset = function() {
      this.calc_tick_rate(125);
      this.speed = 6;
      this.tr_counter = 0;
      this.cur_tick = 0;
      this.cur_row = 0;
      this.cur_pos = 0;
      return this.delay = 0;
    };

    Player.prototype.tick = function() {
      var arp_no, ch, channel, fxpl, line, note, np, trem_vol, voice, _i, _len;
      if (this.pattern_only) {
        line = this.module.patterns[this.cur_pattern][this.cur_row];
      } else {
        line = this.module.patterns[this.module.pattern_table[this.cur_pos]][this.cur_row];
      }
      ch = 0;
      for (_i = 0, _len = line.length; _i < _len; _i++) {
        note = line[_i];
        voice = this.mixer.voices[ch];
        channel = this.channels[ch];
        fxpl = note.command_params & 0x0F;
        trem_vol = 0;
        if (!this.cur_tick) {
          if (note.sample) {
            channel.sample = note.sample;
            channel.finetune = this.module.samples[note.sample - 1].finetune;
            channel.volume = this.module.samples[note.sample - 1].volume;
          }
          if (note.command_params) {
            channel.fxbuf[note.command] = note.command_params;
          }
          if (note.note && (note.command !== 14 || ((note.command_params >> 4) !== 13))) {
            channel.note = note.note;
            this.trig_note(ch, note);
          }
          switch (note.command) {
            case 4:
            case 6:
              if (channel.fxbuf[4] & 0x0f) {
                channel.vib_ampl = channel.fxbuf[4] & 0x0f;
              }
              if (channel.fxbuf[4] & 0xf0) {
                channel.vib_speed = channel.fxbuf[4] >> 4;
              }
              if (channel.vib_ampl) {
                channel.set_period(0, this.VIB_TABLE[channel.vib_wave][channel.vib_ampl - 1][channel.vib_pos]);
              }
              break;
            case 7:
              if (channel.fxbuf[7] & 0x0f) {
                channel.trem_ampl = channel.fxbuf[7] & 0x0f;
              }
              if (channel.fxbuf[7] & 0xf0) {
                channel.trem_speed = channel.fxbuf[7] >> 4;
              }
              if (channel.trem_ampl) {
                trem_vol = this.VIB_TABLE[channel.trem_wave][channel.trem_ampl - 1][channel.trem_pos];
              }
              break;
            case 12:
              channel.volume = window.MP.player.clamp(note.command_params, 0, 64);
              break;
            case 14:
              if (fxpl) channel.fxbuf_14[note.command_params >> 4] = fxpl;
              switch (note.command_params >> 4) {
                case 1:
                  channel.period = Math.max(113, channel.period - channel.fxbuf_14[1]);
                  break;
                case 2:
                  channel.period = Math.min(856, channel.period + channel.fxbuf_14[1]);
                  break;
                case 4:
                  channel.vib_wave = fxpl & 3;
                  if (channel.vib_wave === 3) channel.vib_wave = 0;
                  channel.vib_retr = fxpl & 4;
                  break;
                case 5:
                  channel.finetune = fxpl;
                  if (channel.finetune >= 8) channel.finetune -= 16;
                  break;
                case 7:
                  channel.trem_wave = fxpl & 3;
                  if (channel.trem_wave === 3) channel.trem_wave = 0;
                  channel.trem_retr = fxpl & 4;
                  break;
                case 9:
                  if (channel.fxbuf_14[9] && !note.note) {
                    this.trig_note(ch, note);
                    channel.retrig_count = 0;
                  }
                  break;
                case 10:
                  channel.volume = Math.min(channel.volume + channel.fxbuf_14[10], 64);
                  break;
                case 11:
                  channel.volume = Math.max(channel.volume - channel.fxbuf_14[11], 0);
                  break;
                case 14:
                  this.delay = channel.fxbuf_14[14];
              }
              break;
            case 15:
              if (note.command_params) {
                if (note.command_params <= 32) {
                  this.speed = note.command_params;
                } else {
                  this.calc_tick_rate(note.command_params);
                }
              }
          }
        } else {
          switch (note.command) {
            case 0:
              if (note.command_params) {
                arp_no = 0;
                switch (this.cur_tick % 3) {
                  case 1:
                    arp_no = note.command_params >> 4;
                    break;
                  case 2:
                    arp_no = note.command_params & 0x0F;
                }
                channel.set_period(arp_no);
              }
              break;
            case 1:
              channel.period = Math.max(113, channel.period - channel.fxbuf[1]);
              break;
            case 2:
              channel.period = Math.min(856, channel.period + channel.fxbuf[2]);
              break;
            case 5:
              if (channel.fxbuf[5] & 0xF0) {
                channel.volume = Math.min(channel.volume + (channel.fxbuf[5] >> 4), 64);
              } else {
                channel.volume = Math.max(channel.volume - (channel.fxbuf[5] & 0x0f), 0);
              }
              np = channel.get_period();
              if (channel.period > np) {
                channel.period = Math.max(channel.period - channel.fxbuf[3], np);
              } else if (channel.period < np) {
                channel.period = Math.min(channel.period + channel.fxbuf[3], np);
              }
              break;
            case 3:
              np = channel.get_period();
              if (channel.period > np) {
                channel.period = Math.max(channel.period - channel.fxbuf[3], np);
              } else if (channel.period < np) {
                channel.period = Math.min(channel.period + channel.fxbuf[3], np);
              }
              break;
            case 6:
              if (channel.fxbuf[6] & 0xF0) {
                channel.volume = Math.min(channel.volume + (channel.fxbuf[6] >> 4), 64);
              } else {
                channel.volume = Math.max(channel.volume - (channel.fxbuf[6] & 0x0F), 0);
              }
              if (channel.vib_ampl) {
                channel.set_period(0, this.VIB_TABLE[channel.vib_wave][channel.vib_ampl - 1][channel.vib_pos]);
              }
              channel.vib_pos = (channel.vib_pos + channel.vib_speed) & 0x3f;
              break;
            case 4:
              if (channel.vib_ampl) {
                channel.set_period(0, this.VIB_TABLE[channel.vib_wave][channel.vib_ampl - 1][channel.vib_pos]);
              }
              channel.vib_pos = (channel.vib_pos + channel.vib_speed) & 0x3f;
              break;
            case 7:
              this.trem_vol = this.VIB_TABLE[channel.trem_wave][channel.trem_ampl][channel.trem_pos];
              channel.trem_pos = (channel.trem_pos + c.trem_speed) & 0x3f;
              break;
            case 10:
              if (channel.fxbuf[10] & 0xF0) {
                channel.volume = Math.min(channel.volume + (channel.fxbuf[10] >> 4), 64);
              } else {
                channel.volume = Math.max(channel.volume - (channel.fxbuf[10] & 0x0f), 0);
              }
              break;
            case 11:
              if (this.cur_tick === this.speed - 1) {
                this.cur_row -= 1;
                this.cur_pos = note.command_params;
              }
              break;
            case 13:
              if (this.cur_tick = this.speed - 1) {
                this.cur_pos++;
                this.cur_row = (10 * (note.command_params >> 4) + (note.command_params & 0x0f)) - 1;
              }
              break;
            case 14:
              switch (note.command_params >> 4) {
                case 6:
                  if (!fxpl) {
                    channel.loopstart = this.cur_row;
                  } else if (this.cur_tick === this.speed - 1) {
                    if (channel.loopcount < fxpl) {
                      this.cur_row = channel.loopstart - 1;
                      channel.loopcount++;
                    } else {
                      channel.loopcount = 0;
                    }
                  }
                  break;
                case 9:
                  channel.retrig_count++;
                  if (channel.retrig_count === channel.fxbuf_14[9]) {
                    channel.retrig_count = 0;
                    this.trig_note(ch, note);
                  }
                  break;
                case 12:
                  if (this.cur_tick === channel.fxbuf_14[12]) channel.volume = 0;
                  break;
                case 13:
                  channel.note = note.note;
                  if (this.cur_tick === channel.fxbuf_14[13]) {
                    this.trig_note(ch, note);
                  }
              }
          }
        }
        voice.volume = window.MP.player.clamp(channel.volume + trem_vol, 0, 64);
        voice.period = channel.period;
        ch++;
      }
      this.cur_tick++;
      if (this.cur_tick >= this.speed * (this.delay + 1)) {
        this.cur_tick = 0;
        this.cur_row++;
        this.delay = 0;
      }
      if (this.cur_row >= 64) {
        this.cur_row = 0;
        if (!this.pattern_only) this.cur_pos++;
      }
      if (this.cur_pos >= this.module.pattern_table_length) {
        return this.cur_pos = 0;
      }
    };

    Player.prototype.render = function(l_buf, r_buf, len) {
      var offset, todo, _results;
      offset = 0;
      _results = [];
      while (len > 0) {
        todo = Math.min(len, this.tr_counter);
        if (todo) {
          this.mixer.render(l_buf, r_buf, offset, todo);
          offset += todo;
          len -= todo;
          _results.push(this.tr_counter -= todo);
        } else {
          if (this.playing) this.tick();
          _results.push(this.tr_counter = Math.floor(this.tick_rate));
        }
      }
      return _results;
    };

    return Player;

  })();

  try {
    window.MP.PlayerInstance = new window.MP.player.Player();
  } catch (error) {
    window.MP.PlayerInstance = null;
    window.MP.PlayerError = error;
  }

}).call(this);
