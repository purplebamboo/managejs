var acorn = require("./acorn.js");
var walk = require("./walk.js");
var escodegen = require("escodegen");

var _ = require('underscore');



/**
 * 用于将一段javascript字符串 解析成一个jsnodelist对象.
 *
 * @example
 * 		root = require('queryjs').transfer("code");
 *   	root.stringify();
 * 
 * @param  {string} jsString 需要解析的字符串
 * @param  {object} options  配置项
 * @param  {boolean} options.remainSpace 是否保留各种空格，为true的话会保留以前的格式。会消耗性能，并且容易出错
 * @param  {boolean} options.remainComment 是否保留注释
 * @return {JsNodeList}      根节点，JsNodeList对象，可以使用提供的一系列方法
 */
exports.transfer = function(jsString, options) {

	var OPTIONS = options || {};
	var JS_STRING = jsString;


	var MATCH_HASH = (function() {

		// function matchCallExpression(jsNode, reg) {

		// 	var astNode = jsNode.astObj;
		// 	var callString = "";
		// 	var oriArguments = astNode.arguments;
		// 	astNode.arguments = [];
		// 	callString = escodegen.generate(astNode);
		// 	//console.log(escodegen.generate(astNode));
		// 	astNode.arguments = oriArguments;

		// 	return reg.test(callString);

		// }


		function matchFunctionDeclaration(jsNode, reg) {
			var astNode = jsNode.astObj;
			var identify = astNode.id.name;

			return reg.test(identify);
		}


		function matchForStatement(jsNode, reg) {

			var astNode = jsNode.astObj;
			var oriBody = astNode.body;
			astNode.body = {
				"type": "BlockStatement",
				"body": []
			};
			var testString = escodegen.generate(astNode);
			astNode.body = oriBody;

			return reg.test(testString);
		}

		function matchIfStatement(jsNode, reg) {
			var astNode = jsNode.astObj;
			var testString = escodegen.generate(astNode.test);

			return reg.test(testString);
		}

		function matchWhileStatement(jsNode, reg) {
			var astNode = jsNode.astObj;
			var testString = escodegen.generate(astNode.test);

			return reg.test(testString);
		}

		function matchIdetify(jsNode, reg) {
			var astNode = jsNode.astObj;
			var parentAstNode = jsNode.parentJsNode.astObj;

			if (parentAstNode.type == "VariableDeclarator") {
				return reg.test(parentAstNode.id.name);
			}

			if (parentAstNode.type == "Property") {
				return reg.test(parentAstNode.key.name);
			}

			if (parentAstNode.type == "AssignmentExpression") {
				return reg.test(escodegen.generate(parentAstNode.left));
			}

			return false;

		}

		function matchString(jsNode, reg) {
			var astNode = jsNode.astObj;
			var testString = escodegen.generate(astNode);

			return reg.test(testString);


		}

		var map = {
			'Expression': matchIdetify,
			'FunctionDeclaration': matchFunctionDeclaration,
			'IfStatement': matchIfStatement,
			'ForStatement': matchForStatement,
			'WhileStatement': matchWhileStatement
		}
		return {
			getMatchFn:function(type){

				if(_isExpression(type)) type = 'Expression';

				return _.has(map, type) ? map[type] : false;

			},
			getMatchString:function(){
				return matchString;
			}
		}


	})();


	var walkBase = walk.make({
		'VariableDeclarator': function(node, st, c) {
			if (node.init) c(node.init, st, "Expression");
		},
		'VariableDeclaration': function(node, st, c) {
			for (var i = 0; i < node.declarations.length; ++i) {
				var decl = node.declarations[i];
				c(decl, st);
			}
		}

	})

	function walkAst(node, visitors, base, state) {
		if (!base) base = walkBase;
		if (!state) state = {};

		function c(node, st, override) {
			var type = override || node.type,
				found = visitors[type];


			var jsNode = new JsNode(node);

			if (!override) {
				jsNode.parentJsNode = st.prevNode;
				st.prevNode = jsNode;

			}

			if (found) found(jsNode, st);

			base[type](node, st, c);

			if (!override) st.prevNode = jsNode.parentJsNode;

			
		}
		c(node, state);
	};




	var MANAGE_HASH = []

	//当原始的语法树做出了修改，需要记录下来修改点.
	//astObj为空代表删除
	//start == end 代表新增加
	function _posUpdate(start, end, astObjs) {

		MANAGE_HASH.push({
			start: start,
			end: end,
			astObjs: astObjs
		})


	}


	function _replaceStr(oriStr, start, end, str) {
		var pre, next;
		pre = oriStr.substring(0, start);
		next = oriStr.substring(end);

		return pre + str + next;

	}
	//用来通过jsnode生成代码，保留原有格式。
	//由于树型结构的特殊性，所以只会有包含的关系，不会存在交叉的问题
	function _generateCode(jsnode) {
		var lastPos, curStr, plusNum, codeStart, codeEnd, oriStr, curManageHash;



		codeStart = jsnode.astObj.start;
		codeEnd = jsnode.astObj.end;

		if (codeStart == false && codeEnd == false) {
			//如果是新增的节点，直接返回
			return _astobj2string(jsnode.astObj);
		}

		oriStr = JS_STRING.substring(codeStart, codeEnd);


		//筛选出来受到影响的，操作。
		curManageHash = _.filter(MANAGE_HASH, function(obj) {
			return obj.start >= codeStart;
		})

		//排序

		curManageHash.sort(function(p, n) {
			return p.start > n.start;
		})

		lastPos = 0;
		plusNum = 0;

		_.each(curManageHash, function(manageObj) {

			if (manageObj.start + plusNum < lastPos) return;

			curStr = _.isString(manageObj.astObjs) ? manageObj.astObjs : _astobj2string(manageObj.astObjs);

			oriStr = _replaceStr(oriStr, manageObj.start + plusNum - codeStart, manageObj.end + plusNum - codeStart, curStr);
			//更新浮标
			plusNum += curStr.length;
			lastPos = manageObj.end + plusNum;

		})

		return oriStr;

	}

	function _astobj2string(astObjs) {
		var tmpStr = '';
		astObjs = _.isArray(astObjs) ? astObjs : [astObjs];

		_.each(astObjs, function(astObj) {
			tmpStr += escodegen.generate(astObj,{comment: OPTIONS.remainComment})

		})

		return tmpStr;
	}

	var Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ClassBody: 'ClassBody',
        ClassDeclaration: 'ClassDeclaration',
        ClassExpression: 'ClassExpression',
        ComprehensionBlock: 'ComprehensionBlock',
        ComprehensionExpression: 'ComprehensionExpression',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExportBatchSpecifier: 'ExportBatchSpecifier',
        ExportDeclaration: 'ExportDeclaration',
        ExportSpecifier: 'ExportSpecifier',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        ForOfStatement: 'ForOfStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        GeneratorExpression: 'GeneratorExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        ImportSpecifier: 'ImportSpecifier',
        ImportDeclaration: 'ImportDeclaration',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        MethodDefinition: 'MethodDefinition',
        ModuleDeclaration: 'ModuleDeclaration',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SpreadElement: 'SpreadElement',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        TaggedTemplateExpression: 'TaggedTemplateExpression',
        TemplateElement: 'TemplateElement',
        TemplateLiteral: 'TemplateLiteral',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression'
    };

    // Generation is done by generateExpression.
    function _isExpression(jsnode) {

    	var type = _.isString(jsnode) ? jsnode : jsnode.astObj.type;

        switch (type) {
        case Syntax.AssignmentExpression:
        case Syntax.ArrayExpression:
        case Syntax.ArrayPattern:
        case Syntax.BinaryExpression:
        case Syntax.CallExpression:
        case Syntax.ConditionalExpression:
        case Syntax.ClassExpression:
        case Syntax.ExportBatchSpecifier:
        case Syntax.ExportSpecifier:
        case Syntax.FunctionExpression:
        case Syntax.Identifier:
        case Syntax.ImportSpecifier:
        case Syntax.Literal:
        case Syntax.LogicalExpression:
        case Syntax.MemberExpression:
        case Syntax.MethodDefinition:
        case Syntax.NewExpression:
        case Syntax.ObjectExpression:
        case Syntax.ObjectPattern:
        case Syntax.Property:
        case Syntax.SequenceExpression:
        case Syntax.ThisExpression:
        case Syntax.UnaryExpression:
        case Syntax.UpdateExpression:
        case Syntax.YieldExpression:
            return true;
        }
        return false;
    }

    // Generation is done by generateStatement.
    function _isStatement(jsnode) {

    	var type = _.isString(jsnode) ? jsnode : jsnode.astObj.type;

        switch (type) {
        case Syntax.BlockStatement:
        case Syntax.BreakStatement:
        case Syntax.CatchClause:
        case Syntax.ContinueStatement:
        case Syntax.ClassDeclaration:
        case Syntax.ClassBody:
        case Syntax.DirectiveStatement:
        case Syntax.DoWhileStatement:
        case Syntax.DebuggerStatement:
        case Syntax.EmptyStatement:
        case Syntax.ExpressionStatement:
        case Syntax.ForStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
        case Syntax.FunctionDeclaration:
        case Syntax.IfStatement:
        case Syntax.LabeledStatement:
        case Syntax.ModuleDeclaration:
        case Syntax.Program:
        case Syntax.ReturnStatement:
        case Syntax.SwitchStatement:
        case Syntax.SwitchCase:
        case Syntax.ThrowStatement:
        case Syntax.TryStatement:
        case Syntax.VariableDeclaration:
        //case Syntax.VariableDeclarator:
        case Syntax.WhileStatement:
        case Syntax.WithStatement:
            return true;
        }
        return false;
    }

	function _isJsNodelist(node){

		return node instanceof JsNodeList;
	}

	function _nodesTransferExpression(nodelist) {
		var newAstNodes;
		if (_.isString(nodelist)) {

			newAstNodes = [acorn.parseExpressionAt(nodelist)];

		} else {
			newAstNodes = _.map(nodelist.getNodes(), function(jsNode) {
				return JSON.parse(JSON.stringify(jsNode.astObj));

			})
		}
		//将start end置为空 标识是新增的节点
		return _.map(newAstNodes, function(newAst) {
			newAst['start'] = false;
			newAst['end'] = false;
			newAst['newNode'] = true;
			return newAst;
		});
	}

	function _nodesTransferStatement(nodelist) {
		var newAstNodes;
		if (_.isString(nodelist)) {
			newAstNodes = acorn.parse(nodelist, {
				ranges: true
			}).body;
		} else {
			newAstNodes = _.map(nodelist.getNodes(), function(jsNode) {
				return JSON.parse(JSON.stringify(jsNode.astObj));
			})
		}


		return _.map(newAstNodes, function(newAst) {
			newAst['start'] = false;
			newAst['end'] = false;
			newAst['isNewNode'] = true;
			return newAst;
		});
	}

	function JsNode(astObj, parentJsNode) {
		var self = this;
		self.astObj = astObj;
		self.parentJsNode = parentJsNode || null;
	}

	JsNode.prototype._find = function(types, reg,matchFn) {
		var self = this;
		var visitors = {};
		var results = [];

		if (!_.isArray(types)) types = [types];

		if (reg) {
			reg = _.isRegExp(reg) ? reg : new RegExp(reg);
		}

		var _exec = function(jsNode, st) {

			if (!reg) {
				results.push(jsNode);
			} else if (matchFn(jsNode, reg)) {
				results.push(jsNode);
			}
		}

		_.each(types, function(type) {
			visitors[type] = _exec;
		})

		walkAst(self.astObj, visitors);

		return results;

	}

	
	JsNode.prototype.find = function(type, reg) {
		var self = this;

		return this._find(type, reg, function(jsNode, reg) {
			var astNode = jsNode.astObj;
			var type = astNode.type;
			var matchFn = MATCH_HASH.getMatchFn(type); //? MATCH_HASH.getMatchFn(type) : MATCH_HASH.getMatchString();
			var matchStr = MATCH_HASH.getMatchString();

			return (matchFn && matchFn(jsNode, reg)) || matchStr(jsNode, reg);
		});

	}
	 

	JsNode.prototype.findById = function(type, reg){
		var matchFn = MATCH_HASH[type]

		return this._find(type,reg,function(jsNode, reg){

			var astNode = jsNode.astObj;
			var type = astNode.type;

			var fn = MATCH_HASH.getMatchFn(type);
			if(!fn) return false;

			return fn(jsNode, reg);

		})
	}

	  
	  
	 

	JsNode.prototype.findByString = function(type, reg){
		return this._find(type,reg,MATCH_HASH.getMatchString());
	}
	 

	JsNode.prototype.findByFn = function(type,fn){

		return this._find(type,'.',fn);
	}

	/**
	 * 替换当前节点集合
	 *
	 * @example
	 * 		root = require('queryjs').transfer("var test222 = 'xxxx'");
	 * 	 	root.findById('Literal','xx').replaceWith("'hahaha'"); //var test222 = 'hahaha'
	 * 	 	
	 * @param {string|nodelist} nodelist 需要替换的类容，可以是字符串，或者JsNodeList对象。
	 *
	 * @return {JsNodeList} 返回替换后的新节点
	 * 
	 */

	JsNode.prototype.replaceWith = function(nodelist) {
		var self = this;
		var curAstNode = self.astObj;
		var parentAstNode = self.parentJsNode.astObj;

		var key = null;

		var comments = [];

		var returnNodes = null;
		//if (!key) return self;


		var newAstNodes = null;


		if (_isStatement(self)) {
			newAstNodes = _nodesTransferStatement(nodelist);
		} else {
			newAstNodes = _nodesTransferExpression(nodelist);
		}

		_.each(parentAstNode, function(v, k) {
			if (_.isObject(v) && v == curAstNode) {
				key = k;
				parentAstNode[k] = newAstNodes[0];

				returnNodes = [new JsNode(newAstNodes[0], self.parentJsNode)];
			}

			if (_.isArray(v) && (key = _.indexOf(v, curAstNode)) != -1) {
				Array.prototype.splice.apply(v, [key, 1].concat(newAstNodes));

				returnNodes = _.map(newAstNodes, function(statement) {
					return new JsNode(statement, self.parentJsNode);
				});
			}
		})

		return returnNodes ? returnNodes : self;

	}

	/**
	 *  解析当前节点生成源代码
	 *
	 * @example
	 * 		root = require('queryjs').transfer("var test222 = 'xxxx'");
	 * 	 	root.stringify(); //var test222 = 'xxxx'
	 * 	 	
	 */
	
	JsNode.prototype.stringify = function() {

		if (OPTIONS.remainSpace) {
			//保持以前的格式
			return _generateCode(this);
		} else {
			return _astobj2string(this.astObj);

		}


	}

	/**
	 *  获取当前节点所在的语句(statement)节点
	 *
	 * @example
	 * 		root = require('queryjs').transfer("var test222 = 'xxxx'");
	 * 		root.findById('Literal','xx')    // 'xx'
	 * 	 	root.findById('Literal','xx').getCurrentStatement() //var test222 = 'xxxx'
	 * 	 	
	 */

	JsNode.prototype.getCurrentStatement = function() {
		var state = this;
		var returnSt = null;
		while (state && state.astObj.type != 'Program') {

			if (_isStatement(state)) {
				returnSt = state;
				break;
			}

			state = state.parentJsNode;
		}
		return returnSt;

	}


	var MATCH_METHOD_FACTORY = (function() {

		var _append = function(nodelist) {
			var curJsNode = this;
			var block = null;
			if (curJsNode.astObj.type == 'IfStatement') {
				block = curJsNode.astObj.consequent;
			} else {
				block = curJsNode.astObj.body;
			}

			var newAstNodes = _nodesTransferStatement(nodelist);
			block.body = block.body.concat(newAstNodes);

			//_posUpdate(block.end - 1, block.end - 1, newAstNodes);


			return curJsNode;

		}
		var _prepend = function(nodelist) {
			var curJsNode = this;
			var block = null;
			if (curJsNode.astObj.type == 'IfStatement') {
				block = curJsNode.astObj.consequent;
			} else {
				block = curJsNode.astObj.body;
			}

			var newAstNodes = _nodesTransferStatement(nodelist);
			block.body = newAstNodes.concat(block.body);

			//_posUpdate(block.start + 1, block.start + 1, newAstNodes);

			return curJsNode;

		}

		var _insertBefore = function(nodelist) {
			
			if(!_isJsNodelist(nodelist)) return;


			var curJsNode = this;
			var nodes = nodelist.getNodes();
			var statements, key;

			_.each(nodes, function(node) {

				if (!_isStatement(node)) return;

				statements = node.parentJsNode.astObj.body;
				key = _.indexOf(statements, node.astObj);
				statements.splice(key, 0, JSON.parse(JSON.stringify(curJsNode.astObj)));

			})

		}
		var _insertAfter = function(nodelist) {

			if(!_isJsNodelist(nodelist)) return;


			var curJsNode = this;
			var nodes = nodelist.getNodes();
			var statements, key;

			_.each(nodes, function(node) {

				if (!_isStatement(node)) return;

				statements = node.parentJsNode.astObj.body;
				key = _.indexOf(statements, node.astObj);
				statements.splice(key + 1, 0, JSON.parse(JSON.stringify(curJsNode.astObj)));

			})

		}

		var _getSplice = function(key){
			var arrayKey = key;
			return function(){
				var curJsNode = this;
				var arrayValues = curJsNode.astObj[arrayKey];
				var returnArgs = []; //
				var args = Array.prototype.slice.call(arguments);

				var leftArgs = args.slice(0, 2);
				var rightArgs = args.slice(2);
				
				_.map(rightArgs, function(arg) {
					returnArgs = returnArgs.concat(_nodesTransferExpression(arg));
				})

				returnArgs = leftArgs.concat(returnArgs);

				var returnAstNodes = Array.prototype.splice.apply(arrayValues, returnArgs);
				return _.map(returnAstNodes, function(node) {
					return new JsNode(node, curJsNode);
				});

			}
			
		}

		var functionMethods = {
			getParam: function(index) {
				var curJsNode = this;
				var params = curJsNode.astObj.params;
				index = parseInt(index) || 0;

				if (index > params.length - 1) return [];

				if (index < 0) index = params.length + index;

				return new JsNode(params[index], curJsNode);

			},
			addParam: function(identifyName) {
				var curJsNode = this;
				var params = curJsNode.astObj.params;
				var node = {
					"type": "Identifier",
					"name": identifyName
				};
				params.push(node);

				return curJsNode;
			},
			allParam: function() {
				var curJsNode = this;
				var params = curJsNode.astObj.params;
				return _.map(params, function(param) {
					return new JsNode(param, curJsNode);
				})

			},
			spliceParam: _getSplice('params'),
			append: _append,
			prepend: _prepend
		}

		var typeFunctionHash = {

			CallExpression: {
				get: function(index) {
					var curJsNode = this;
					var params = curJsNode.astObj.arguments;
					index = parseInt(index);

					if (index > params.length - 1) return [];

					if (index < 0) index = params.length + index;

					return new JsNode(params[index], curJsNode);
				},
				spliceParam:_getSplice('arguments')
			},
			ObjectExpression: {
				get: function(key) {
					var curJsNode = this;
					var properties = curJsNode.astObj.properties;
					var findedProtyAstNode = null;

					_.each(properties, function(pro) {
						if (pro.key.name == key) {
							findedProtyAstNode = pro;
						}

					})

					if (!findedProtyAstNode) return [];

					return new JsNode(findedProtyAstNode.value, new JsNode(findedProtyAstNode, curJsNode));
				},
				add: function(key, nodelist) {
					var curJsNode = this;
					var keyNode = _nodesTransferExpression(key)[0];
					var newAstNodes = _nodesTransferExpression(nodelist);
					var coneProperty = {
						"type": "Property",
						"key": keyNode,
						"value": newAstNodes[0],
						"kind": "init"
					}

					curJsNode.astObj.properties.push(coneProperty);

					//if(curJsNode.astObj.properties.length > 1) _posUpdate(curJsNode.astObj.end - 2, curJsNode.astObj.end - 2, ',');
					//_posUpdate(curJsNode.astObj.end - 1, curJsNode.astObj.end - 1, coneProperty);

					return new JsNode(coneProperty, curJsNode);
				},
				remove: function(key) {
					var curJsNode = this;
					var pros = curJsNode.astObj.properties;
					var index = -1;
					var curPro;
					
					_.each(pros, function(pro, k) {
						if (escodegen.generate(pro.key) == key) {
							index = k;
						}

					})

					if(index == -1) return;


				 	curJsNode.astObj.properties.splice(index, 1);
					
					curPro = curJsNode.astObj.properties[index];

					//if(!curPro.isNewNode) _posUpdate(curPro.start, curPro.end, '');

					return curJsNode;
				}

			},
			ArrayExpression: {
				get: function(index) {
					var curJsNode = this;
					var elements = curJsNode.astObj.elements;
					if (index > elements.length - 1) return [];

					if (index < 0) index = elements.length + index;

					return new JsNode(elements[index], curJsNode);
				},
				splice: _getSplice('elements'),
				push: function(str) {
					var returnAstNodes = _nodesTransferExpression(str);
					var curJsNode = this;
					var elements = curJsNode.astObj.elements;
					curJsNode.astObj.elements = elements.concat(returnAstNodes);

					//_posUpdate(curJsNode.astObj.end-1,curJsNode.astObj.end-1,returnAstNodes);

					return _.map(returnAstNodes, function(node) {
						return new JsNode(node, curJsNode);
					});
				}
			},
			FunctionExpression: functionMethods,
			FunctionDeclaration: functionMethods,
			IfStatement: {
				append: _append,
				prepend: _prepend
			},
			ForStatement: {
				append: _append,
				prepend: _prepend
			},
			WhileStatement: {
				append: _append,
				prepend: _prepend
			}
		}

		_.each(typeFunctionHash, function(v, k) {

			if (_isStatement(k)) {
				v['insertBefore'] = _insertBefore;
				v['insertAfter'] = _insertAfter;
			}

			//为了节点上原型方法都可以被 节点list调用到
			//原型方法上基本都是通用方法
			_.extend(v, JsNode.prototype);

		})


		var returnObj = {};


		returnObj.getAllMethods = function() {
			var methods = [];

			_.each(typeFunctionHash, function(v) {
				methods = methods.concat(_.keys(v));
			})
			methods = _.uniq(methods);

			return methods;
		}

		returnObj.getFn = function(jsNode, method) {

			var type = jsNode.astObj.type;
			var methodsObj, methodFn;


			if (_.has(typeFunctionHash, type) && typeFunctionHash[type][method]) return typeFunctionHash[type][method];

			if (_.has(JsNode.prototype, method)) return JsNode.prototype[method];

			return false;
		}

		return returnObj;

	})();



	function proxy(method) {

		return function() {
			var self = this;
			var jsNodes = self.getNodes();
			var newJsNodes = [];
			var args = arguments;
			_.each(jsNodes, function(jsNode) {
				var returnNodes = null;
				var methodFn = null;

				methodFn = MATCH_METHOD_FACTORY.getFn(jsNode, method);
				if (!methodFn) return;

				returnNodes = methodFn.apply(jsNode, args);
				if (!returnNodes) return;

				returnNodes = _.isArray(returnNodes) ? returnNodes : [returnNodes];
				newJsNodes = newJsNodes.concat(returnNodes);

			})

			return new JsNodeList(newJsNodes);
		}


	}

	function JsNodeList(jsNodes) {
		var self = this;
		self.length = jsNodes.length;

		_.each(jsNodes, function(v, k) {
			self[k] = v;
		});

		var methods = _.difference(MATCH_METHOD_FACTORY.getAllMethods(), _.keys(JsNodeList.prototype));
		_.map(methods, function(method) {
			self[method] = proxy(method);
		})

	}

	JsNodeList.prototype.getNodes = function() {
		var self = this;
		if (self.length == 0) return [];

		var nodeArray = [];

		for (var i = 0; i < self.length; i++) {

			nodeArray.push(self[i])
		}
		return nodeArray;
	}

	JsNodeList.prototype.item = function(index){
		var i = parseInt(index);
		var nodes = this.getNodes();

		if(i < 0 || i > nodes.length -1) return;


		return new JsNodeList([nodes[i]]);
	}


	JsNodeList.prototype.stringify = function() {

		var nodes = this.getNodes();
		var jsString = '';
		_.each(nodes, function(node) {
			jsString += node.stringify();
		})
		return jsString;
	}


	var comments = [];
	var tokens = [];

	var newAstNode = acorn.parse(jsString, {
		ranges: true,
		onComment: comments,
		onToken: tokens
	});
	escodegen.attachComments(newAstNode, comments, tokens);

	return new JsNodeList([new JsNode(newAstNode)]);

}