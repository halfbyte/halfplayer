
window.MP = { player: {}, constants: {}}

window.MP.constants.BASE_PTABLE = [
    0, 1712,1616,1525,1440,1357,1281,1209,1141,1077,1017, 961, 907,
    856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480, 453,
    428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226,
    214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113,
    107, 101,  95,  90,  85,  80,  76,  71,  67,  64,  60,  57]

$ ->
  unless MP.PlayerInstance
    $('.notice').append("<div class='error'>This Browser does not support realtime audio output. Please use Firefox, Chrome or install Flash.</div>")
    return null

  set_sample_names = (mod) ->
    list = $('.samples')
    list.html("");
    _(mod.samples).each (sample) ->
      list.append("<li>" + sample.name + "</li>")


  $('.stop').click (e) ->
    e.preventDefault()
    me = $(this)

    return if me.hasClass('inactive')
    $('.button.play').removeClass('active')
    me.addClass('active')
    MP.PlayerInstance.stop()


  $('.play').click (e) ->
    e.preventDefault()
    me = $(this)
    return if me.hasClass('inactive')
    MP.PlayerInstance.play()
    me.addClass('active')
    $('.button.stop').removeClass('active')


  $('.mod').click (e) ->
    url = @href
    $(".mod").removeClass('active');
    $(this).addClass('active');

    oReq = new XMLHttpRequest()
    oReq.open "GET", url, true
    oReq.responseType = "arraybuffer"

    oReq.onload = (oEvent) ->
      arrayBuffer = oReq.response
      if arrayBuffer
        mod = new MP.Mod(arrayBuffer)
        set_sample_names(mod)
        MP.PlayerInstance.set_module(mod)
        MP.PlayerInstance.play()
        $('.button.stop,.button.play').removeClass('inactive')
        $('.button.play').addClass('active')

    oReq.send(null);

    e.preventDefault()


  $('.playlist').on 'dragenter', (e) ->
    $(this).addClass('dropTarget');

  $('.playlist').on 'dragleave', (e) ->
    $(this).removeClass('dropTarget');

  $('.playlist').on 'dragover', (e) ->
    e.preventDefault()
  $('.playlist').on 'drop', (e) ->
    $(this).removeClass('dropTarget');
    e.preventDefault()
    console.log(e.originalEvent.dataTransfer);
    file = e.originalEvent.dataTransfer.files.item(0)
    fr = new FileReader()
    fr.onload = (e) ->
      mod = new MP.Mod(e.target.result);
      set_sample_names(mod);
      MP.PlayerInstance.set_module(mod)
      MP.PlayerInstance.play()
      $('.button.stop,.button.play').removeClass('inactive')
      $('.button.play').addClass('active')
    fr.readAsArrayBuffer(file)





  # give the app a single instance only
