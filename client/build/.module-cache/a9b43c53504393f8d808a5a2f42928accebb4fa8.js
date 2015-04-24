/** @jsx React.DOM */

// socket操作用のインスタンスをnewしてReactに食わせている
// 食わせた結果(dom)をbodyに渡すようになっている
var socketService = new SocketService();



var CmmentBox = React.createClass({displayName: "CmmentBox",
  requestComments: function () {

    // CommentBoxをnewする際にpropsに対してsocketServiceを渡している
    // Backboneでいうところのinitialize処理のattributesみたいなもんだね
    var socket = this.props.socketService;
    // this.stateを空にする処理
    this.setState({data: []});

    // socketサーバーに対してのrequest送信
    // ソケットから返ってきたmessageを操作するために無名関数をなげている
    // このcallbackの仕組み自体はSocketServiceの実装を読めばわかる
    // function(message)の:messageに関してはsocketサーバーのレスポンスのmessageが使うことになるよ
    socket.sendRequest({$type: 'commentsRequested'}, function (message) {

      // このへんのif文連打は返ってきたmessageの種別（サーバー側で処理したhandlerごとにtypeが決定している）
      // を判定して処理の出し訳を行っている
      // requestCompleteに関してはpending状態になっていたcallbackmethodの開放を行っている
      if (message.$type === 'dataReceived') {
        // state.data.に対して結果を詰め込みまくる
        if (!message.data) return;
        this.state.data.push(message.data);
      }
      if (message.$type === 'dataCompleted') {
        // ある程度データ詰め込みが完了した際に.setStateすることでrenderが動くのを誘っている
        socket.requestComplete(message.$id);
        this.setState({data: this.state.data});
      }
      if (message.$type === 'error') {
        // errorの場合は申し訳程度にpending状態のcallbackメソッドの開放を
        socket.requestComplete(message.$id);
      }
    }.bind(this));
  },

  // onCommentSubmit時のhandler
  handleCommentSubmit: function (comment) {
    // this.state.dataに対して新しいcommentをappend処理したいだけ
    // こんな雑な書き方をしてもReactのdiffエンジンの恩恵を受けれるのはいいなぁ
    this.state.data.push(comment);
    this.setState({data: this.state.data});
    console.log('TODO - submit comment');
  },

  /**
   * this.stateの初期値定義
   * backboneで言うところのdefaultみたいなもの
   */
  getInitialState: function () {
    return {data: []};
  },

  // socketサーバーに対してリクエストを投げている
  // ここが結構な処理の起点となっているようだ
  componentWillMount: function () {
    this.requestComments();
  },
  render: function () {
    return (
      React.createElement("div", {className: "commentBox"}, 
        React.createElement("h1", null, "Comments"), 
        React.createElement("input", {type: "submit", value: "Refresh", onClick: this.requestComments}), 

        "// CommentList. CommentFormという内包するdomのレンダリングを行う", 
        React.createElement(CommentList, {data: this.state.data}), 
        React.createElement(CommentForm, {onCommentSubmit: this.handleCommentSubmit})
      )
      );
  }
});

var Comment = React.createClass({displayName: "Comment",
  render: function () {
    return (
      React.createElement("div", {className: "comment"}, 
        React.createElement("h2", {className: "commentAuthor"}, this.props.author), 
        React.createElement("span", null, this.props.children.toString())
      )
      );
  }
});

var CommentList = React.createClass({displayName: "CommentList",
  // propsに.dataをのせた状態でnewされている
  // コメント数分のCommentClassをrenderする
  render: function () {
    var commentNodes = this.props.data.map(function (comment, index) {
      return React.createElement(Comment, {key: index, author: comment.author}, comment.text);
    });
    return React.createElement("div", {className: "commentList"}, commentNodes);
  }
});

/**
 * textboxをもつform領域をレンダリングさせるためのReactClass
 */
var CommentForm = React.createClass({displayName: "CommentForm",

  /**
   * submit押下時の処理
   */
  handleSubmit: function () {
    // textbox.valueを取得している
    var author = this.refs.author.getDOMNode().value.trim();
    var text   = this.refs.text.getDOMNode().value.trim();

    // なぜpropsにonCommentSubmitがあるのかというとClass生成時に
    // 引数で渡しているからである
    // 中の処理に関しては親で定義しているのでソコを見る
    this.props.onCommentSubmit({author: author, text: text});

    // textboxのなかをcleanしているだけ
    this.refs.author.getDOMNode().value = '';
    this.refs.text.getDOMNode().value = '';
    return false;
  },
  render: function () {
    return (
      React.createElement("form", {className: "commentForm", onSubmit: this.handleSubmit}, 
        React.createElement("input", {type: "text", placeholder: "Your name", ref: "author"}), 
        React.createElement("input", {type: "text", placeholder: "Say something...", ref: "text"}), 
        React.createElement("input", {type: "submit", value: "Post"})
      )
      );
  }
});

React.renderComponent(
  React.createElement(CmmentBox, {socketService: socketService}),
  document.body
);
