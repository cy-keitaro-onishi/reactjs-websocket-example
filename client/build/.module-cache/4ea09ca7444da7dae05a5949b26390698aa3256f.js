'use strict';
function SocketService() {
  var service = {};
  var pendingCallbacks = {};
  var currentMessageId = 0;
  var ws;
  var preConnectionRequests = [];
  var connected = false;

  function init() {
    service = {};
    pendingCallbacks = {};
    currentMessageId = 0;
    preConnectionRequests = [];
    connected = false;

    // なるほどこの書き方ならhttp/wsの相乗りが確立できる
    ws = new WebSocket("ws://" + window.location.hostname + (location.port ? ':' + location.port : ''));

    ws.onopen = function () {
      connected = true;
      if (preConnectionRequests.length === 0) return;

      console.log('Sending (%d) requests', preConnectionRequests.length);
      for (var i = 0, c = preConnectionRequests.length; i < c; i++) {
        ws.send(JSON.stringify(preConnectionRequests[i]));
      }
      preConnectionRequests = [];
    };

    // webstorageをcloseした際の処理
    // 特に今回のサンプルコードを見る限りこいつが呼ばれることはないのかなとは思う
    ws.onclose = function() {
      connected = false;
    };

    // こいつがメッセージ受信時のイベント
    // 届いたmessageをlistenerメソッドに評価させている
    ws.onmessage = function (message) {

      // [data]というところにsendした内容が入っている
      // 他の属性にはwebsocketのレスポンスとしてのmetaデータが格納されているようだ
      console.dir(message);
      listener(JSON.parse(message.data));
    };
  }

  init();

  function sendRequest(request, callback) {

    // コネクションが切れている場合は再接続を試みる
    if(ws && ~[2,3].indexOf(ws.readyState)) {
      connected = false;
      init();
    }

    // リクエストに一意なidを降っている
    // これをすることでresponseがあった際にcallbackのmethodを走らせれるようになる
    // requestのメタ情報に関しては$propertyという命名規則にしているだけで$に意味はなさそう
    // jQueryオブジェクトと紛らわしいんだけど
    request.$id = generateMessageId();
    pendingCallbacks[request.$id] = callback;

    if (!connected) {

      // コネクションが張られていなかった場合は
      // あとで発行できるようにためておいている
      preConnectionRequests.push(request);
      console.log('preConnectionRequests.push(request);');
    } else {
      // これでrequestを飛ばしている
      ws.send(JSON.stringify(request));
    }
    return request.$id;
  }

  function listener(message) {
    // とばしたrequestに対応しているresponseなのかを判定し
    // マッチした際はrequestを送信する際に設定していたcallback用のmethodを実行する
    // pendingCallbacksというとことにcallbackmethodを貯めこむことでcallbackの仕組みを実装しているんだね
    if (pendingCallbacks.hasOwnProperty(message.$id))
      pendingCallbacks[message.$id](message);
  }

  /**
   * リクエストが完了した際に
   * pend状態のcallbackを開放したいのでそのインタフェースとしてmethodを作っている
   */
  function requestComplete(id) {
    //console.log("requestComplete:", id, 'ws.readyState', ws.readyState);
    delete pendingCallbacks[id];
  }

  // webstorageとのセッションを切断して、
  // もう一回繋ぎ直しをしている
  function stopRequest(id) {
    ws.close();
    init();
  }

  function generateMessageId() {
    if (currentMessageId > 10000)
      currentMessageId = 0;

    return new Date().getTime().toString() + '~' + (++currentMessageId).toString();
  }

  // SocketService.serviceにいくつかのメソッドをmountしたいだけ
  service.sendRequest     = sendRequest;
  service.requestComplete = requestComplete;
  service.stopRequest     = stopRequest;
  return service;
}
