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

  constructor: (data, callback) ->
    if data.byteLength
      @from_array_buffer(data)
    else
      @from_json(data)

    _.defer(callback) if typeof(callback) == 'function'

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
