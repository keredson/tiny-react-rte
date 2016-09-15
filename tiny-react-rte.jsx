
var BLOCK_ELEMENTS = {
  div:'Paragraph',
  h1:'Heading 1',
  h2:'Heading 2',
  h3:'Heading 3',
  blockquote:'Quotation',
};

var TinyReactRTENode = function(id, type, children, value) {
  this.id = id ? id : type +'-'+ Math.random().toString(36).substring(2);
  this.type = type;
  if (children!=null) {
    this.children = children.slice(0);
    for (var i=0; i<this.children.length; ++i) {
      if (typeof this.children[i] === 'string') {
        this.children[i] = new TinyReactRTENode(null, null, null, this.children[i])
      }
    }
  }
  if(!(value==null || typeof value === 'string')) throw "value must be string, not "+ value
  this.value = value;
  if (this.value==null && this.children==null) throw "nothing here!";
};

var TinyReactRTEBlock = React.createClass({
  getInitialState: function() {
    return {hover:false};
  },
  changeType: function(e) {
    console.log(e.target.value)
  },
  render: function() {
    var children = this.props.children;
    if (this.state.hover) {
      children = [(
        <span key='trrc' className='tiny-react-rte-control' style={{float:'right'}}>
          <select value={this.props.type} onChange={this.changeType}>
            {Object.keys(BLOCK_ELEMENTS).map(function(k) {return (<option key={k} value={k}>{BLOCK_ELEMENTS[k]}</option>);}.bind(this))}
          </select>
        </span>
      )].concat(children);
    };
    var props = {
      key: this.key,
      id: this.props.id,
      style: this.props.style,
      onMouseEnter: function() {this.setState({hover:true});}.bind(this),
      onMouseLeave: function() {this.setState({hover:false});}.bind(this),
    };
    return React.createElement(this.props.type, props, children);
  }
});

TinyReactRTENode.prototype = {

  toReact: function() {
    if (!this.type) return this.value || String.fromCharCode(13);
    var children = this.children==null ? null : this.children.map(function(child) {
      if (child && child.toReact) return child.toReact(true);
      else return child;
    });
    var style = {whiteSpace:'pre-wrap'}
    var type = this.type;
    if (this.isBlock()) {
      type = TinyReactRTEBlock;
      style['minHeight'] = '1.2em';
    }
    return React.createElement(type, {key:this.id, id:this.id, style:style, type:this.type}, children);
  },
  
  isEmpty: function() {
    if (this.value) return false;
    if (this.children!=null) {
      for (var i=0; i<this.children.length; ++i) {
        if (!this.children[i].isEmpty()) return false;
      }
    }
    return true;
  },
  
  mergeLeft: function (i) {
    if (i==0) throw "nothing to merge into";
    var left = this.children[i-1];
    var right = this.children[i];
    if (left.children==null) left = new TinyReactRTENode(left.id, left.type, [left.value]);
    if (right.children==null) right = new TinyReactRTENode(right.id, right.type, [right.value]);
//    while (left.children.length>0 && left.children[left.children.length-1].isEmpty()) left.children.pop();
//    while (right.children.length>0 && right.children[0].isEmpty()) right.children.shift();
    left = new TinyReactRTENode(left.id, left.type, left.children.concat(right.children));
    var newChildren = this.children.slice(0,i-1).concat([left]).concat(this.children.slice(i+1));
    return new TinyReactRTENode(this.id, this.type, newChildren, this.value);
  },
  
  applyToNode: function (path, func, args) {
    if (path.length==0) {
      console.log('apply', func, args, this);
      return this[func].apply(this, args);
    }
    if (this.children==null) {
      console.log(path, this)
      throw "bad path: "+ path
    }
    var newChildren = this.children.slice(0);
    newChildren[path[0]] = newChildren[path[0]].applyToNode(path.slice(1), func, args)
    return new TinyReactRTENode(this.id, this.type, newChildren, this.value);
  },
  
  get: function (path) {
    var node = this;
    for (var i=0; i<path.length; ++i) node = node.children[path[i]];
    return node;
  },
  
  pathToNodes: function (path) {
    var node = this;
    var nodes = [];
    for (var i=0; i<path.length; ++i) {
      node = node.children[path[i]];
      nodes.push(node);
    }
    return nodes;
  },
  
  replace: function (node) {
    return node;
  },

  isBlock: function () {
    return BLOCK_ELEMENTS[this.type]!=null;
  },
  
  replaceText: function (pos, chars, value) {
    if (this.type) {
      if (this.children==null || this.children.length==0) {
        return new TinyReactRTENode(this.id, this.type, [value], null);
      } else {
        var newChildren = this.children.slice(0);
        var i = Math.min(pos, newChildren.length-1);
        newChildren[i] = newChildren[i].replaceText(pos, chars, value);
        return new TinyReactRTENode(this.id, this.type, newChildren, null);
      }
    }
    var newValue = [this.value.slice(0, Math.max(0, pos)), value, this.value.slice(pos+chars)].join('');
    return new TinyReactRTENode(this.id, null, null, newValue);
  },
  
  keepSide: function(left, path, pos) {
    if (path.length==0) {
      var newValue = this.value!=null ? (left ? this.value.substring(0, pos) : this.value.substring(pos)) : null;
      var newChildren = this.children==null ? null : (left ? this.children.slice(0,pos) : this.children.slice(pos));
      console.log('keepSide', this)
      return new TinyReactRTENode(null, this.type, newChildren, newValue);
    }
    var newChildren = left ? this.children.slice(0,path[0]) : [];
    newChildren.push(this.children[path[0]].keepSide(left, path.slice(1), pos));
    if (!left) newChildren = newChildren.concat(this.children.slice(path[0]+1))
    return new TinyReactRTENode(null, this.type, newChildren, this.value);
  },

};

var TinyReactRTE = React.createClass({

  getInitialState: function() {
    var content = new TinyReactRTENode(null, 'div', [
      new TinyReactRTENode(null, 'div', ["Hello, ",new TinyReactRTENode(null, 'b', ["world"]),"! This is a comment box."]),
      new TinyReactRTENode(null, 'div', ["This is a ",new TinyReactRTENode(null, 'i', ["second"])," line..."]),
    ]);
    return {
      history: [{content:content, caret: null}],
      selection: [1,0,0],
      content: content,
    };
  },

  getPath: function(node) {
    var path = [];
    while (!(node===this.refs.root)) {
      var position = -1;
      for (var elem=node; elem!=null; elem=elem.previousSibling) {
        if (elem.nodeType != Node.COMMENT_NODE && elem.className!='tiny-react-rte-control') ++position;
      }
      path.unshift(position);
      node = node.parentNode;
    }
    path = path.slice(1)
    console.log('path', path);
    return path;
  },

  onKeyDown: function(e) {
    console.log('onKeyDown', e.key, e.keyCode);
    if (e.ctrlKey && e.keyCode==90) {
      this.undo();
      e.preventDefault();
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key=="Unidentified") return;
    if (e.key=="ArrowUp" || e.key=="ArrowDown" || e.key=="ArrowLeft" || e.key=="ArrowRight") return;
    if (e.key=="Backspace" || e.key=="Delete") {
      e.preventDefault();
      var selection = window.getSelection();
      var newSelection = null;
      var content = this.state.content;
      if (selection.isCollapsed) {
        var pos = selection.anchorOffset;
        if (e.key=="Backspace") {
          var anchorNode = selection.anchorNode;
          if (pos==0) {
            var path = this.getPath(anchorNode);
            while (path[path.length-1]==0) path.pop();
            var left = content.get(path.slice(0,path.length-1).concat([path[path.length-1]-1]));
            var leftPos = left.children==null ? 1 : left.children.length;
            console.log('leftPos', leftPos);
            content = content.applyToNode(path.slice(0,path.length-1), 'mergeLeft', [path[path.length-1]]);
            newSelection = path.slice(0,path.length-1).concat([Math.max(0,path[path.length-1]-1), leftPos, 0]);
          } else {
            var path = this.getPath(anchorNode);
            content = content.applyToNode(path, 'replaceText', [pos-1, 1, '']);
            newSelection = path.concat([pos-1]);
          }
        } else {
          var path = this.getPath(selection.anchorNode);
          content = content.applyToNode(path, 'replaceText', [pos, 1, '']);
          newSelection = path.concat([pos]);
        }

      } else {
        var range = selection.getRangeAt(0);
        content = this.deleteRange(content, range);
        newSelection = this.getPath(range.startContainer).concat([range.startOffset]);
      }
      this.saveState();
      this.setState({
        content:content,
        selection: newSelection,
      })
    }
  },
  
  domParents: function(node) {
    var nodes = [node];
    for (; node; node = node.parentNode) {
      nodes.unshift(node);
    }
    return nodes;
  },
  
  commonAncestor: function (a, b) {
    var aParents = this.domParents(a);
    var bParents = this.domParents(b);
    for (var i=0; i < aParents.length; i++) {
      if (aParents[i] != bParents[i]) return aParents[i-1];
    }
  },

  onKeyPress: function(e) {
    e.preventDefault();
    console.log('onKeyPress', e.key, e.keyCode)
    var selection = window.getSelection();
    var c = String.fromCharCode(e.which);
    this.saveState();
    var content = this.state.content;
    var path = this.getPath(selection.anchorNode);
    if (!selection.isCollapsed) {
      content = this.deleteRange(content, selection.getRangeAt(0));
    }
    var path = this.getPath(selection.anchorNode);
    var pos = selection.anchorOffset;
    if (e.key=="Enter") {
      var nodes = content.pathToNodes(path);
      console.log(nodes)
      for (var i=nodes.length-1; i>=0; --i) {
        if (nodes[i].isBlock()) {
          console.log(i)
          var path2BlockParent = path.slice(0,i);
          var blockIndex = path[i];
          var block0 = i==0 ? content : nodes[i-1];
          var block1 = nodes[i].keepSide(true, path.slice(i+1), pos);
          var block2 = nodes[i].keepSide(false, path.slice(i+1), pos);
          console.log('block0', block0)
          console.log('block1', block1)
          console.log('block2', block2)
          var newChildren = block0.children.slice(0,blockIndex).concat([block1,block2]).concat(block0.children.slice(blockIndex+1))
          block0 = new TinyReactRTENode(block0.id, block0.type, newChildren);
          content = content.applyToNode(path.slice(0,i), 'replace', [block0]);
          console.log('pathpath', path)
          ++path[i];
          path[i+1]=0;
          this.setState({
            content:content,
            selection: path.concat([0]),
          })
          break;
        }
      }
    } else {
      content = content.applyToNode(path, 'replaceText', [pos, 0, c]);
      this.setState({
        content:content,
        selection: path.concat([pos+1]),
      })
    }
  },
  
  deleteRange: function(content, range) {
    if (range.startContainer === range.endContainer) {
      var path = this.getPath(range.startContainer);
      var chars = range.endOffset - range.startOffset;
      return content.applyToNode(path, 'replaceText', [range.startOffset, chars, '']);
    } else {
      var commonPath = this.getPath(range.commonAncestorContainer);
      var startPath = this.getPath(range.startContainer).slice(commonPath.length);
      var endPath = this.getPath(range.endContainer).slice(commonPath.length);
      var common = content.get(commonPath);
      var left = common.get(startPath.slice(0,1)).keepSide(true, startPath.slice(1), range.startOffset);
      var right = common.get(endPath.slice(0,1)).keepSide(false, endPath.slice(1), range.endOffset);
      if (left.isBlock() && right.isBlock()) {
        left = new TinyReactRTENode(null, left.type, left.children.concat(right.children));
        common = common.applyToNode(startPath.slice(0,1), 'replace', [left]);
        var newCommonChildren = common.children.slice(0,startPath[0]+1).concat(common.children.slice(endPath[0]+1));
        common = new TinyReactRTENode(null, common.type, newCommonChildren);
      } else {
        common = common.applyToNode(startPath.slice(0,1), 'replace', [left]);
        common = common.applyToNode(endPath.slice(0,1), 'replace', [right]);
        var newCommonChildren = common.children.slice(0,startPath[0]+1).concat(common.children.slice(endPath[0]));
        common = new TinyReactRTENode(null, common.type, newCommonChildren);
      }
      return content.applyToNode(commonPath, 'replace', [common]);
    }
  },

  saveState: function() {
    var history = this.state.history.slice(0);
    history.push({
      content: this.state.content,
      selection: this.state.selection,
    })
    this.setState({history:history})
  },
  
  undo: function() {
    var history = this.state.history.slice(0);
    var state = history.pop();
    if (state) {
      this.setState({
        history: history,
        content: state.content,
        selection: state.selection,
      });
    }
  },

  componentDidMount: function() {
    this.moveSelection();
  },
  
  componentDidUpdate: function() {
    this.moveSelection();
  },
  
  getNthChild: function(node, n) {
    for (var i=0, x=0; i<node.childNodes.length; ++i) {
      if (node.childNodes[i].nodeType==Node.COMMENT_NODE) continue;
      if (x==n) return node.childNodes[i];
      ++x;
    }
    [][n];
  },
  
  filterCommentNodes: function(nodes) {
    return [].filter.call(nodes, function(n) {return n.nodeType!=Node.COMMENT_NODE && n.className!='tiny-react-rte-control';});
  },
  
  moveSelection: function() {
    var node = this.refs.root.childNodes[0];
    var path = this.state.selection;
    var pos = path[path.length-1];
    for (var i=0; i<path.length; ++i) {
      if (node.nodeType==Node.TEXT_NODE) break;
      var children = this.filterCommentNodes(node.childNodes);
      if (children.length==0) break;
      if (path[i]>=children.length) pos = -1
      node = children[Math.min(path[i],children.length-1)];
    }
    while (pos==-1 && node.nodeType==Node.ELEMENT_NODE) {
      var children = this.filterCommentNodes(node.childNodes);
      if (children.length==0) break;
      console.log(children)
      node = children[children.length-1];
    }
    console.log('ddd',path, node)
    var range = document.createRange();
    var sel = window.getSelection();
    var length = node.length || node.innerText.length;
    console.log(pos, length, node)
    if (pos==-1) {
      range.setStart(node, length);
    } else {
      range.setStart(node, Math.min(length, pos));
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  },
    
  render: function() {
    return (
      <div contentEditable="true" suppressContentEditableWarning="true" ref="root" style={{outline:"0px solid transparent", minHeight:'1.2em'}} 
        onKeyUp={this.onKeyUp} onKeyDown={this.onKeyDown} onKeyPress={this.onKeyPress}>
        <div>{this.state.content.children.map(function(c) {return c.toReact()})}</div>
      </div>
    );
  }

})

window.TinyReactRTE = TinyReactRTE;

