
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

TinyReactRTENode.prototype = {

  replace2: function(start_path, end_path, v) {
    console.log('replace2', start_path, end_path, v)
    if (start_path[0]==end_path[0] && this.children) {
      var i = start_path[0];
      var children = this.children.slice(0, i);
      var new_start_path = start_path.slice(1);
      var new_end_path = end_path.slice(1);
      children.push(this.children[i].replace2(new_start_path, new_end_path, v));
      children = children.concat(this.children.slice(i+1));
      return new TinyReactRTENode(null, this.type, children);
    } else if (this.value) {
      var s = this.value.slice(0, start_path[0]) + v + this.value.slice(end_path[0]);
      return new TinyReactRTENode(null, this.type, null, s);
    }
    console.log('should not be here')
  },

  toReact: function() {
    if (!this.type) return this.value || String.fromCharCode(13);
    var children = this.children==null ? null : this.children.map(function(child) {
      if (child && child.toReact) return child.toReact();
      else return child;
    });
    var style = {whiteSpace:'pre-wrap'}
    var type = this.type;
    return React.createElement(type, {key:this.id, rte_id:this.id, id:this.id, style:style, type:this.type}, children);
  },
  
  toHTML: function() {
    if (!this.type) return this.value || String.fromCharCode(13);
    var children = this.children==null ? null : this.children.map(function(child) {
      if (child && child.toHTML) return child.toHTML();
      else return child;
    });
    var type = this.type;
    return '<'+ type +'>\n' + this.indent(children.join('\n')) +'\n</'+ type +'>';
  },
  
  indent: function(s) {
    return s.split('\n').map(function(s) {return '  '+s}).join('\n');
  },
  
};


function toArray(obj) {
    var l = obj.length, out = [];
    for(var i=0; i<obj.length; ++i) out[i] = obj[i];
    return out;
}

var ALLOWED_NODES = ['P','DIV','I','EM','B','BR','H1','H2','H3','A', 'UL', 'LI', 'IMG', 'U', 'STRONG', 'BLOCKQUOTE', 'SPAN', 'TABLE', 'TR', 'TD', 'TBODY', 'OL'];
var ALLOWED_ATTRIBUTES = {'A':['href'], 'IMG':['src']};
var NODES_NO_CHILDREN = ['BR', 'IMG'];

function domToReact(node) {
  if (node.nodeType==3) return node.nodeValue;
  if (ALLOWED_NODES.indexOf(node.nodeName) < 0) return '';
  var children = null;
  if (NODES_NO_CHILDREN.indexOf(node.nodeName) == -1) {
    children = toArray(node.childNodes).map(function(n) {
      return domToReact(n);
    });
  }
  return new TinyReactRTENode(null, node.nodeName.toLowerCase(), children);
}



var TinyReactRTE = React.createClass({

  parseHTML: function(html) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, "text/html");
    var newChildren = toArray(doc.body.childNodes).map(function(n) {
      return domToReact(n);
    });
    return new TinyReactRTENode(null, 'div', newChildren, this.value);
  },

  getInitialState: function() {
    var content = this.parseHTML("<div>Derek</div><div><b>was</b> here!</div>");
    return {
      content: content,
      history: [],
      start_path: [0,0,0],
      end_path: [0,0,0],
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
  

  onKeyPress: function(e) {
    e.preventDefault();
    console.log('onKeyPress', e.key)
    var content = this.state.content;
    console.log('content', content);
    content = content.replace2(this.state.start_path, this.state.end_path, e.key);
    console.log('content', content);
    this.saveState();
    this.setState({content:content});
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
//    this.moveSelection();
  },
  
  componentDidUpdate: function() {
    this.moveSelection();
  },
  
  moveSelection: function(path, node) {
    console.log('moveSelection', path, node)
    if (!path) {
      path = this.state.start_path;
      node = this.refs.root;
    }
    if (path.length==1) {
      var range = document.createRange();
      var sel = window.getSelection();
      range.setStart(node, path[0]);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      var p = path[0];
      var children = toArray(node.childNodes).filter(function(n) {return n.id});
      console.log('children', p, children)
      this.moveSelection(path.slice(1), children[path[0]]);
    }
  },
  
  onClick: function(e) {
  },
  
  onClick: function(e) {
    console.log('onClick', e);
    var selection = window.getSelection();
    var start_offset = selection.anchorOffset;
    var start_path = this.getPath(selection.anchorNode);
    start_path.push(start_offset);
//    console.log('start_path', start_path)
    var end_path = this.getPath(selection.focusNode);
    var end_offset = selection.focusOffset;
    end_path.push(end_offset);
    var is_range = !(selection.anchorNode==selection.focusNode && start_offset==end_offset);
    this.setState({
      start_path: start_path,
      end_path: end_path,
      is_range: is_range,
    });
    console.log('start_path', start_path)
    console.log('is_range', is_range)
  },
  
    
  render: function() {
    return (
      <div>
        <div contentEditable="true" suppressContentEditableWarning="true" ref="root" style={{outline:"0px solid transparent", minHeight:'1.2em'}} 
          onKeyUp={this.onKeyUp} onKeyDown={this.onKeyDown} onKeyPress={this.onKeyPress} onClick={this.onClick} onSelect={this.onSelect}>
          {this.state.content.toReact()}
        </div>
        {this.props.showMarkup ? (
          <pre style={{borderTop:'1px solid #eee', marginTop:'1em', marginBottom:'0em', paddingTop:'1em', overflowX:'scroll'}}>
            {this.state.content.toHTML()}
          </pre>
        ) : ''}
      </div>
      
    );
  }

})

window.TinyReactRTE = TinyReactRTE;

