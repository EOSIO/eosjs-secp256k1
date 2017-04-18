var secp256k1 = {
    worker: null,
    in_progress: null,
    init_complete: false,
    args_spec: {},
    api: {},
    args: null,
    callback: null,
    error_callback: null,
    throw_error: function(err, wrap_type) {
        var error = err;
        if (typeof wrap_type !== 'undefined')
        {
            error = {'error_type': wrap_type, 'error_msg': err};
        }
        secp256k1.in_progress = null;
        var error_cb = secp256k1.error_callback;
        secp256k1.error_callback = null;
        secp256k1.callback = null;
        if (error_cb !== null)
        {
            error_cb(error);
        }
    },
    return_value: function(val) {
        secp256k1.in_progress = null;
        var cb = secp256k1.callback;
        secp256k1.error_callback = null;
        secp256k1.callback = null;
        if (cb !== null)
        {
            cb(val);
        }
    },
    init: function() {
        if(typeof Worker === "undefined")
        {
            throw "Error: secp256k1.js requires Web Worker support";
        }
        else if (this.worker !== null)
        {
            throw "Error: Worker already initialized";
        }
        
        secp256k1.init_complete = false;
        secp256k1.in_progress = 'init';
        secp256k1.worker = new Worker("libsecp256k1.js");
        var ab = new ArrayBuffer(1);
        secp256k1.worker.postMessage(ab, [ab]);
        if (ab.byteLength)
        {
            // Transferable Objects not supported.
            // Clean up and throw error.
            secp256k1.in_progress = null;
            secp256k1.terminate();
            secp256k1.worker = null;
            throw "Error: secp256k1.js requires Transferable Object support";
        }

        return new Promise(function(resolve, reject) {
            secp256k1.error_callback = reject;
            secp256k1.callback = resolve;
            secp256k1.worker.onmessage = function(event) {
                var data = event['data'];
                if (data['error'] !== null)
                {
                    secp256k1.throw_error(data['error']);
                    return;
                }
                try
                {
                    switch(data['type'])
                    {
                        case 'init_complete':
                            secp256k1.api = {};
                            secp256k1.args_spec = {};
                            for (fname in data['inner_api'])
                            {
                                if (data['inner_api'].hasOwnProperty(fname))
                                {
                                    secp256k1.args_spec[fname] = data['inner_api'][fname];
                                    secp256k1.api[fname] = (function(fname, args_spec) {
                                        return function() {
                                            var map_mode = 0;
                                            var proc_args, map;
                                            try
                                            {
                                                if (secp256k1.worker === null)
                                                {
                                                    throw "secp256k1 has not yet been initialized";
                                                }
                                                else if (secp256k1.in_progress !== null)
                                                {
                                                    throw "Another operation is already in progress";
                                                }
                                                if (arguments.length === 0)
                                                {
                                                    throw "No arguments provided";
                                                }
                                                proc_args = arguments[0];
                                                if (arguments.length >= 2)
                                                {
                                                    map = arguments[1];
                                                    if (Object.prototype.toString.call(map).slice(8, -1) === 'Array')
                                                    {
                                                        map_mode = 2;
                                                        if (!(map.length >= args_spec.length))
                                                        {
                                                            throw "Argument map array does not map all arguments";
                                                        }
                                                    }
                                                    else
                                                    {
                                                        map_mode = 1;
                                                    }
                                                }
                                            }
                                            catch(err)
                                            {
                                                throw {'error_type': 'api', 'error_msg': err};                    
                                            }
                                            try
                                            {
                                                secp256k1.in_progress = fname;
                                                var args = {};
                                                var update = {'map': {}, 'status': {}};
                                                var buffers = [];
                                                
                                                var get_type = function(o) {
                                                    var actual_type = Object.prototype.toString.call(o).slice(8, -1);
                                                    var type = null;
                                                    switch(actual_type) {
                                                        case 'Int8Array':
                                                        case 'Uint8Array':
                                                        case 'Uint8ClampedArray':
                                                            type = 'i8';
                                                            break;
                                                        case 'Int16Array':
                                                        case 'Uint16Array':
                                                            type = 'i16';
                                                            break;
                                                        case 'Int32Array':
                                                        case 'Uint32Array':
                                                            type = 'i32';
                                                            break;
                                                        case 'Float32Array':
                                                            type = 'float';
                                                            break;
                                                        case 'Float64Array':
                                                            type = 'double';
                                                            break;
                                                        case 'Array':
                                                            if (o.length !== 0)
                                                            {
                                                                var type = Object.prototype.toString.call(o[0]).slice(8, -1);
                                                                for (var i = 1; i < o.length; ++i)
                                                                {
                                                                    if (inner_type !== Object.prototype.toString.call(o[i]).slice(8, -1))
                                                                    {
                                                                        type = null;
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                            break;
                                                    }
                                                    return {'actual': actual_type, 'typed_array_inner': type};
                                                };

                                                // Validate arguments and fill buffers
                                                for (var i = 0, l = args_spec.length; i < l; ++i)
                                                {
                                                    var arg_spec = args_spec[i];
                                                    var arg_name = arg_spec['name'];
                                                    var mapped_arg_name = arg_name;
                                                    switch(map_mode)
                                                    {
                                                        case 1:
                                                            if (map.hasOwnProperty(arg_name))
                                                            {
                                                                mapped_arg_name = map[arg_name];
                                                            }
                                                            break;
                                                        case 2:
                                                            mapped_arg_name = map[i];
                                                            break;
                                                    }
                                                    if (typeof proc_args[mapped_arg_name] === 'undefined')
                                                    {
                                                        throw "Argument '" + arg_name + "' not provided in call to function '" + fname + "'";
                                                    }
                                                    var type = get_type(proc_args[mapped_arg_name]);
                                                    var is_valid = false;
                                                    var is_typed_array = false;
                                                    var update_status = 0;
                                                    switch(arg_spec['type'])
                                                    {
                                                        case 'Null':
                                                        case 'Number':
                                                            if (type['actual'] === 'Number')
                                                            {
                                                                is_valid = true;
                                                                if (arg_spec['out'])
                                                                {
                                                                    update_status = 1; // 1 means out argument is single Number
                                                                }
                                                            }
                                                            else if (arg_spec['out'] && type['actual'] === 'Array'
                                                                     && proc_args[mapped_arg_name].length === 1
                                                                     && (type['typed_array_inner'] === 'Number' 
                                                                         || type['typed_array_inner'] === 'Null'))
                                                            {
                                                                is_valid = true;
                                                                update_status = 2; // 2 means update single element in array
                                                            }
                                                            break;
                                                        default:
                                                            if (type['actual'] === arg_spec['type'])
                                                            {
                                                                is_valid = true;
                                                            }
                                                            if (arg_spec['type'] !== 'Array' && type['typed_array_inner'] !== null)
                                                            {
                                                                is_typed_array = true;
                                                                update_status = 3; // 3 means update TypedArray
                                                            }
                                                            break;
                                                    }
                                                    if (!is_valid)
                                                    {
                                                        throw ("Incorrect type provided for argument '" + arg_name 
                                                               + "' in call to function '" + fname
                                                               + "': Expected type '" + arg_spec['type'] + 
                                                               + "'. Instead received type '" + type['actual'] + "'.");
                                                    }
                                                    if (update_status === 1)
                                                    {
                                                        args[arg_name] = [proc_args[mapped_arg_name]];
                                                    }
                                                    else
                                                    {
                                                        args[arg_name] = proc_args[mapped_arg_name];
                                                    }
                                                    update['status'][arg_name] = update_status;
                                                    update['map'][arg_name]    = mapped_arg_name;
                                                    if (is_typed_array)
                                                    {
                                                        buffers.push(proc_args[mapped_arg_name]['buffer']);
                                                    }
                                                }
                                                
                                                secp256k1.args = {'args': proc_args, 'update': update};

                                                return new Promise(function(resolve, reject) {
                                                    secp256k1.error_callback = reject;
                                                    secp256k1.callback = resolve;
                                                    secp256k1.worker.postMessage({'operation': 'call',
                                                                                  'procedure': fname, 
                                                                                  'args': args}, buffers);
                                                });
                                            }
                                            catch(err)
                                            {
                                                secp256k1.in_progress = null;
                                                throw {'error_type': 'api', 'error_msg': err};
                                            }
                                        };
                                    })(fname, data['inner_api'][fname]);
                                }
                            }
                            secp256k1.init_complete = true;
                            secp256k1.return_value();
                            return;
                        case 'destroy_complete':
                            secp256k1.worker.terminate();
                            secp256k1.worker = null;
                            secp256k1.init_complete = false;
                            secp256k1.api = {};
                            secp256k1.args_spec = {};
                            secp256k1.args = null;
                            secp256k1.return_value();
                            return;
                        case 'call_return':
                            var args_spec = secp256k1.args_spec[secp256k1.in_progress];
                            var args = secp256k1.args['args'];
                            var update = secp256k1.args['update'];
                            secp256k1.args = null;
                            for (var i = 0, l = args_spec.length; i < l; ++i)
                            {
                                var arg_spec = args_spec[i];
                                var arg_name = arg_spec['name'];
                                switch(update['status'][arg_name])
                                {
                                    case 2: // Update single element in Array
                                        args[update['map'][arg_name]][0] = data['update_args'][arg_name][0];
                                        break;
                                    case 3: // Update TypedArray
                                        args[update['map'][arg_name]] = data['update_args'][arg_name];
                                        break;
                                }
                            }
                            secp256k1.return_value(data['return']);
                            return;
                        default:
                            throw "Unexpected message returned from worker";
                    }
                }
                catch(err)
                {
                    secp256k1.throw_error(err, 'api');
                    return;
                }
            }
        });
    },
    destroy: function() {
        if (secp256k1.worker === null)
        {
            throw {'error_type': 'api', 'error_msg': "secp256k1 has not yet been initialized"};
        }
        else if (secp256k1.in_progress !== null)
        {
            throw {'error_type': 'api', 'error_msg': "Another operation is already in progress"};
        }
        try
        {
            secp256k1.in_progress = 'destroy';
            return new Promise(function(resolve, reject) {
                secp256k1.error_callback = reject;
                secp256k1.callback = resolve;
                secp256k1.worker.postMessage({'operation': 'destroy'});
            });
        }
        catch(err)
        {
            secp256k1.in_progress = null;
            throw {'error_type': 'api', 'error_msg': err};
        }
    } 
};

