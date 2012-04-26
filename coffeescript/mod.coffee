class window.MP.Mod
  # convert array of charcodes to sting
  # seems to magically work.
  NOTES: ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-', 'B#']
  atos: (a) ->
    s = String.fromCharCode(a...).replace(/\x00/g, '')
  signed_nybble: (a) ->
    if a >= 8 then a-16 else a
  note_from_text: (note) ->
    return "---" if note == 0
    oct = Math.floor((note - 1) / 12)
    @NOTES[(note - 1) % 12] + oct

  find_note: (period) ->
    note = 0
    bestd = Math.abs(period - window.MP.constants.BASE_PTABLE[0])
    if (period)
      for i in [1..60]
        d = Math.abs(period - window.MP.constants.BASE_PTABLE[i])
        if d < bestd
          bestd = d
          note = i
    note

  set_sample_hi: (p, r, c, n) ->
    @patterns[p][r][c].sample = ((n & 1) << 4) | (@patterns[p][r][c].sample & 0xf)

  set_sample_lo: (p, r, c, n) ->
    @patterns[p][r][c].sample = (@patterns[p][r][c].sample & 0xf0) | (n & 0xf)

  set_command: (p,r,c,n) ->
    @patterns[p][r][c].command = (n & 0xF)

  set_command_param_hi: (p, r, c, n) ->
    @patterns[p][r][c].command_params = ((n & 0xF) << 4) | (@patterns[p][r][c].command_params & 0xf)

  set_command_param_lo: (p, r, c, n) ->
    @patterns[p][r][c].command_params = (@patterns[p][r][c].command_params & 0xf0) | (n & 0xf)

  set_volume: (sample, volume) ->
    if volume >= 0 && volume <= 64
      @samples[sample].volume = volume

  volume_up: (sample) ->
    @set_volume(sample, @samples[sample].volume + 1)

  volume_down: (sample) ->
    @set_volume(sample, @samples[sample].volume - 1)

  set_finetune: (sample, finetune) ->
    if finetune >= -8 && finetune <= 7
      @samples[sample].finetune = finetune
    console.log(@samples[sample].finetune)

  finetune_up: (sample) ->
    @set_finetune(sample, @samples[sample].finetune + 1)

  finetune_down: (sample) ->
    @set_finetune(sample, @samples[sample].finetune - 1)

  set_note: (pattern, row, channel, note, sample) ->
    @patterns[pattern][row][channel].note = note
    @patterns[pattern][row][channel].note_text = @note_from_text(note)
    @patterns[pattern][row][channel].sample = sample + 1

  delete_note: (pattern, row, channel) ->
    @patterns[pattern][row][channel].note = 0
    @patterns[pattern][row][channel].note_text = '---'
    @patterns[pattern][row][channel].sample = 0

  constructor: (data, callback) ->
    if data.byteLength
      @from_array_buffer(data)
    else
      @from_json(data)

    _.defer(callback) if typeof(callback) == 'function'


  base64ToInt8: (input) ->
    bs = atob(input)
    out = new Int8Array(bs.length)
    for i in [0...bs.length]
      out[i] = bs.charCodeAt(i)
    out

  int8ToBase64: (input) ->
    out = ""
    for i in [0...input.length]
      out += String.fromCharCode((input[i] + 256) % 256)
    btoa(out)


  add_pattern: ->
    pattern = []
    for rownum in [0..63]
      row = []
      for notenum in [0..3]
        row[notenum] = {
          note: 0
          period: 0
          note_text: '---'
          command: 0
          command_params: 0
        }
      pattern[rownum] = row
    @patterns[@num_patterns] = pattern
    @num_patterns++


  from_json: (data) ->
    console.log("loading json")
    @name = data.name
    @samples = data.samples
    @patterns = data.patterns
    @fix_patterns()
    @pattern_table_length = data.pattern_table_length
    @pattern_table = data.pattern_table
    @num_patterns = data.patterns.length
    callbacks = []
    for sample,i in @samples
      if sample.length > 0
        sample.data = @base64ToInt8(data.sample_data[i])
      else
        sample.data = []



  fix_patterns: ->
    for pattern in @patterns
      for row in pattern
        for note in row
          note.note = @find_note(note.period)
          note.note_text = @note_from_text(note.note)


  as_json: ->
    name: @name
    samples: ({name: sample.name, length: sample.length, repeat: sample.repeat, replen: sample.replen, finetune: sample.finetune, volume: sample.volume} for sample in @samples)
    pattern_table_length: @pattern_table_length
    pattern_table: @pattern_table
    patterns: @patterns
    sample_data: (@int8ToBase64(sample.data) for sample in @samples)

  from_array_buffer: (data) ->
    @samples = []
    @patterns = []
    subdata = new Uint8Array(data, 1080, 4);
    if @atos(subdata) == 'M.K.'
      @name = @atos(new Uint8Array(data, 0, 20));
      for i in [0..30]
        sample = {}
        sample.name = @atos(new Uint8Array(data, 20 + (30*i), 22))
        sample_data = new Uint8Array(data, 20 + (30*i) + 22, 8)
        sample.length = ((sample_data[0] << 8) + (sample_data[1])) * 2
        sample.finetune = @signed_nybble(sample_data[2] & 0x0F)
        sample.raw_finetune = sample_data[2] & 0x0F
        sample.volume = sample_data[3]
        sample.repeat = ((sample_data[4] << 8) + (sample_data[5])) * 2
        sample.replen = ((sample_data[6] << 8) + (sample_data[7])) * 2
        @samples.push(sample)

      pattern_data = new Uint8Array(data, 950, 2)
      @pattern_table_length = pattern_data[0]
      @pattern_table = new Uint8Array(data, 952, 128)
      @num_patterns = _.max(@pattern_table)

      for p in [0..@num_patterns]
        pattern = []
        pattern_data = new Uint8Array(data, 1084 + (p * 1024), 1024)
        for s in [0..63]
          step = []
          for c in [0..3]
            note = {}
            note.raw_data = [pattern_data[(s * 16) + (c * 4)], pattern_data[(s * 16) + (c * 4) + 1], pattern_data[(s * 16) + (c * 4) + 2], pattern_data[(s * 16) + (c * 4) + 3]]
            note.period = ((pattern_data[(s * 16) + (c * 4)] & 0x0F) << 8) + (pattern_data[(s * 16) + (c * 4) + 1] & 0xF0) + (pattern_data[(s * 16) + (c * 4) + 1] & 0x0F)
            note.note = @find_note(note.period)
            note.note_text = @note_from_text(note.note)
            note.sample = (pattern_data[(s * 16) + (c * 4)] & 0xF0) + ((pattern_data[(s * 16) + (c * 4) + 2] & 0xF0) >> 4)
            note.command = (pattern_data[(s * 16) + (c * 4) + 2] & 0x0F)
            note.command_params = (pattern_data[(s * 16) + (c * 4) + 3] & 0xF0) + (pattern_data[(s * 16) + (c * 4) + 3] & 0x0F)
            note.hex_command_params = note.command_params.toString(16)

            step.push(note)
          pattern.push(step)
        @patterns.push(pattern)

      offset = 1084 + ((@num_patterns + 1) * 1024)
      for sample in @samples
        sample.data = new Int8Array(data, offset, sample.length)
        offset += sample.length
    else
      throw 'Invalid Module Data'
