if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
{
// This means we are in a Web Worker (which is required)

var libsecp256k1 = {
    /* Each C function that will be wrapped needs to specify an array of type strings corresponding to each argument of
     * the C function. The type string specifies whether the argument acts as only an input or an input/output and also 
     * specifies the C type of the corresponding argument of the C function.
     *
     * The first character in the type string needs to be either 'i' (for input arguments) or 'o' (for input/output arguments).
     * The remaining characters in the type string determine the C type. Options include:
     *      * '8'  for a char or 8-bit integer (unsigned or signed) in C
     *      * '16' for a 16-bit integer (unsigned or signed) in C
     *      * '32' for a 32-bit integer (unsigned or signed) in C
     *      * 'f'  for a C float
     *      * 'd'  for a C double
     *      * '[?]' with ? replaced by one of the above for an array version of the corresponding type (passed as pointer in C)
     *      * 's'  for a NULL-terminated C string (char *)
     *      * 'p'  for a generic pointer (any pointer type in C, e.g. void *)
     *
     * For simplicity LLVM type 'i1' is not supported. Use '8' (for LLVM type 'i8' instead). 
     * Also 'i64' (a 64-bit integer) is not supported, because of complexity with Javascript and how Emscripten handles i64.
     * I could add support for it if really necessary, but it shouldn't be necessary for libsecp256k1 code.
     *
     * This does not support C functions with arguments that pass a struct by value. Instead the C function should be 
     * redesigned to accept a pointer to a struct.
     *
     * You should use a '[?]' when the Javascript caller to the wrapped function wants to provide a *Array as the
     * argument. Here are the appropriate maps:
     *      * '[8]'  => Int8Array or Uint8Array or Uint8ClampedArray
     *      * '[16]' => Int16Array or Uint16Array
     *      * '[32]' => Int32Array or Uint32Array
     *      * '[f]'  => Float32Array
     *      * '[d]'  => Float64Array
     *
     * You should use the '[?]' form (except for '[p]') when the Javascript caller wants to provide a TypedArray as the
     * argument where the type of the TypedArray matches the inner type of the C array type. Caller must ensure size of 
     * the TypedArray is valid (what C expects) and must handle multidimensional arrays manually (row-major format).
     *
     * You should use a 's' when the Javascript caller wants to provide a temporary Javascript string or the C 
     * function returns a NULL-terminated C string whose pointer location is not relevant.
     *
     * For all other cases, 'p' should be used. However, that requires the caller to first allocate the memory region 
     * in the Emscripten memory space (either heap or stack), initialize it, and then pass the pointer as the argument.
     * If the reference to a C string will outlive the called function (e.g. the C function stores the pointer somewhere),
     * then 's' should not be used. Instead 'p' should be used and it should be allocated and initialized 
     * (with NULL termination) properly before passing it as an argument to the wrapped function.
     *
     * If the type is of the 'i[?]' or 'o[?]' form, the Javascript caller to the wrapped function must provide the appropriate
     * TypedArray. Check map above to see which TypedArrays are appropriate depending on the choice replacing the '?'. 
     * If the type is of the 'o[?]' form, the changes to the array in the Emscripten heap by the C function will be copied back 
     * into the TypedArray argument that was passed in by the caller.
     *
     * If the type is 'is', the Javascript caller to the wrapped function must provide a Javascript string.
     * The type 'os' is not allowed. Use either a '[8]' or 'ip' for cases where the passed C string argument must be mutable.
     * And in that case the caller must make sure the string is NULL-terminated.
     *
     * If the type is 'ip', the caller must provide a number representing a valid region of memory in the Emscripten memory space.
     * If the type is 'op', the caller can either provide the number representing the memory region directly or can provide
     * the number representing the memory region as a single element in an Array. If the former, the possibly change pointer
     * is discarded. If you want the pointer to be updated with the changes, it is necessary to pass the number representing
     * the memory region as a single element in an Array so that it is passed by reference in Javascript. 
     *
     * If the type is any other type that starts with a 'i', the caller must just provide the number directly.
     * If the type is any other type that starts with a 'o', the caller can either provide the number directly or can provide 
     * the number as a single element in an Array. If the former, the possibly changed value of the argument is discarded.
     * If you want the argument to be updated with the changes, it is necessary to pass the number as a single element in an Array
     * so that it is passed by reference in Javascript.
     *
     * The return type string can be one of '8', '16', '32', 'f', 'd', 's', 'p' (which mean exactly what one would expect),
     * as well as a new type string 'v' for void. Returning a '[?]' is not supported.
     */ 
    C_api_spec: {
        'secp256k1_context_create': {
            'args': ['i32' /* flags (set to 1 << 0 | 1 << 1 | 1 << 7 | 1 << 8) for all features */],
            'return': 'p'
        },
        'secp256k1_context_destroy': {
            'args': ['ip' /* context */],
            'return': 'v'
        },
        'secp256k1_ecdsa_recover_compact': { 
            'args': ['ip' /* context */, 'i[8]' /* 32-byte msg */, 'i[8]' /* 64-byte sig */, 'o[8]' /* 33-byte pubkey */, 
                     'o32' /* pubkey length */, 'i32' /* is compressed? (always set to 1) */, 'i32' /* recid */],
            'return': '32'
        },
        'secp256k1_ecdsa_sign_compact': {
            'args': ['ip' /* context */, 'i[8]' /* 32-byte msg */, 'o[8]' /* 64-byte sig */, 'i[8]' /* 32-byte seckey */, 
                     'ip' /* noncefp (always set to null) */, 'ip' /* ndata (always set to null) */, 'o32' /* recid */],
            'return': '32'
        },
        'secp256k1_ec_pubkey_create': { 
            'args': ['ip' /* context */, 'o[8]' /* 33-byte pubkey */, 'o32' /* pubkey length */,
                     'i[8]' /* 32-byte seckey */, 'i32' /* is compressed? (always set to 1) */],
            'return': '32'
        },
        'secp256k1_ec_seckey_verify': {
            'args': ['ip' /* context */, 'i[8]' /* 32-byte seckey */],
            'return': '32'
        },
        'secp256k1_scalar_set_b32': {
            'args': ['o[8]' /* 32-byte scalar */, 'i[8]' /* 32-byte bin */, 'o32' /* overflow */],
            'return': '32'
        },
    },
    get_type: function(o) {
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
    },
    wrap_function: function(fname) {
        if (!this.C_api_spec.hasOwnProperty(fname))
        {
            throw "No such function defined in C API";
        }

        var arg_types = this.C_api_spec[fname]['args'];
        var ret_type  = this.C_api_spec[fname]['return'];

        var ret_t;
        switch(ret_type)
        {
            case 's':
                ret_t = 'string';
                break;
            case 'v':
                ret_t = null;
                break;
            case '8':
            case '16':
            case '32':
            case 'f':
            case 'd':
            case 'p':
                ret_t = 'number';
                break;
            default:
                throw ("Invalid return type string ('" + ret_type + "') specified for C function '" + fname + "'");
        }

        // For alignment purposes first allocate space for 8-byte data, then 4-byte data, then 2-byte data, then 1-byte data.
        var initial_reserve_size = 0;
        var arg_size_in = [];
        var fixed_out_temp = {'1': [], '2': [], '4': [], '8': []};
        var arg_sizes = {'fixed_in': [], 'fixed_out': [], 'string_in': [],
                         'var_in':  {'1': [], '2': [], '4': [], '8': []},
                         'var_out': {'1': [], '2': [], '4': [], '8': []}};
        var args_t = [];
        var i = 0;
        arg_types.forEach(function(arg_type) 
        {
            var arg_t;
            var is_out = false;
            var is_array = false;
            var is_valid = false;

            if (arg_type.length >= 2) 
            {
                is_valid = true;
                if (arg_type.charAt(0) === 'o')
                {
                    is_out = true;
                    if (arg_type === 'os')
                    {
                        is_valid = false;
                    }
                }
                else if (arg_type.charAt(0) !== 'i')
                {
                    is_valid = false;
                }
            }

            var arg_type_rest;
            if (is_valid)
            {
                if (arg_type.charAt(1) === '[')
                {
                    is_array = true;
                    if (arg_type.length >= 4 && arg_type.charAt(arg_type.length - 1) === ']')
                    {
                        arg_type_rest = arg_type.slice(2, -1);
                    }
                    else
                    {
                        is_valid = false;
                    }
                }
                else
                {
                    arg_type_rest = arg_type.slice(1);
                }
            }

            if (is_valid)
            {
                var size = 0;
                var type;
                arg_t = 'number';

                switch(arg_type_rest)
                {
                    case '8':
                        size = 1;
                        type = 'i8';
                        break;
                    case '16':
                        size = 2;
                        type = 'i16';
                        break;
                    case '32':
                        size = 4;
                        type = 'i32';
                        break;
                    case 'f':
                        size = 4;
                        type = 'float';
                        break;
                    case 'd':
                        size = 8;
                        type = 'double';
                        break;
                    default:
                        if (is_array)
                        {
                            is_valid = false;
                        }
                        else
                        {
                            switch(arg_type_rest)
                            {
                                case 'p':
                                    size = 4;
                                    type = '*';
                                    break;
                                case 's':
                                    arg_t = 'string';
                                    arg_sizes['string_in'].push(i);
                                    break;
                                default:
                                    is_valid = false;
                                    break;
                            }
                        }
                        break;
                }
                
                if (is_valid)
                {
                    if (is_out && !is_array)
                    {
                        fixed_out_temp[size].push({'index': i, 'size': size, 'type': type, 'offset': initial_reserve_size});
                        initial_reserve_size += size;
                    }
                    else if (!is_array)
                    {
                        arg_sizes['fixed_in'].push({'index': i, 'size': size, 'type': type});
                    }
                    else if (is_out)
                    {
                        arg_sizes['var_out'][size].push({'index': i, 'type': type});
                    }
                    else
                    {
                        arg_sizes['var_in'][size].push({'index': i, 'type': type});
                    }
                }
            }
            
            if (!is_valid)
            {
                throw ("Invalid arg type string ('" + arg_type + "') specified for argument " + (i+1) + " of C function '" + fname + "'");
            }

            args_t.push(arg_t);
            ++i;
        });
        arg_sizes['fixed_out'] = arg_sizes['fixed_out'].concat(fixed_out_temp['8'], fixed_out_temp['4'],
                                                               fixed_out_temp['2'], fixed_out_temp['1']);
        var types = [];
        arg_sizes['fixed_out'].forEach(function(fixed_out)
        {
            var type = fixed_out['type'];
            for (var i = 0, s = fixed_out['size']; i < s; ++i)
            {
                types.push(type);
            }
        });

        var align_to = 1;
        [2, 4, 8].forEach(function(a)
        {
            if (arg_sizes['var_in'][a].length !== 0 || arg_sizes['var_out'][a].length !== 0)
            {
                align_to = a;
            }
        });
        if ((initial_reserve_size & (align_to - 1)) !== 0)
        {
            initial_reserve_size = (initial_reserve_size & ~(align_to - 1)) + align_to;
        }

        var wrapper_func = Module['cwrap'](fname, ret_t, args_t);
        
        return (function(fname, wrapper_func, ret_type, num_args, arg_sizes, types, initial_reserve_size, get_type) {
            return function() {
                if (arguments.length < num_args)
                {
                    throw {'error_type': 'wrapper', 'error_msg':
                           ("Not all arguments provided in call to wrapped C function '" + fname
                            +"': Expected " + num_args + " arguments. Instead only received " 
                            + arguments.length + " arguments.")};
                }

                var proc_args = arguments;
                var args = new Array(arguments.length);
                var slab = [];
                var var_out_offsets = [];
                var var_in_offsets  = [];
                var size = initial_reserve_size;

                [8, 4, 2, 1].forEach(function(s)
                {
                    arg_sizes['var_out'][s].forEach(function(v)
                    {
                        var i = v['index'];
                        var type = get_type(proc_args[i]);
                        if (type['typed_array_inner'] !== v['type'])
                        {
                            throw {'error_type': 'wrapper', 'error_msg':
                                   ("Incorrect type provided for argument " + (i+1) + " in call to wrapped C function '" + fname
                                    + "': Expected a TypeArray compatible with [" + v['type']
                                    + "]. Instead received type '" + type['actual'] + "'.")};
                        }
                        var_out_offsets.push(size);
                        size += (s * proc_args[i].length);
                    });
                    arg_sizes['var_in'][s].forEach(function(v)
                    {
                        var i = v['index'];
                        var type = get_type(proc_args[i]);
                        if (type['typed_array_inner'] !== v['type'])
                        {
                            throw {'error_type': 'wrapper', 'error_msg':
                                   ("Incorrect type provided for argument " + (i+1) + " in call to wrapped C function '" + fname
                                    + "': Expected a TypeArray compatible with [" + v['type']
                                    + "]. Instead received type '" + type['actual'] + "'.")};
                        }
                        var_in_offsets.push(size);
                        size += (s * proc_args[i].length);
                    });
                });
                
                arg_sizes['string_in'].forEach(function(i)
                {
                    var type = get_type(proc_args[i]);
                    if (type['actual'] === 'String')
                    {
                        args[i] = proc_args[i];
                    }
                    else
                    {
                        throw {'error_type': 'wrapper', 'error_msg':
                               ("Incorrect type provided for argument " + (i+1) + " in call to wrapped C function '" + fname
                                + "': Expected a String. Instead received type '" + type['actual'] + "'.")};
                    }
                });

                arg_sizes['fixed_out'].forEach(function(fixed_out)
                {
                    var i = fixed_out['index'];
                    var type = get_type(proc_args[i]);
                    if (type['actual'] === 'Number' || (type['actual'] === 'Null' && fixed_out['type'] === '*'))
                    {
                        if (type['actual'] === 'Null')
                        {
                            slab.push(0);
                        }
                        else
                        {
                            slab.push(proc_args[i]);
                        }
                    }
                    else if (type['actual'] === 'Array' && proc_args[i].length === 1 && 
                             (type['typed_array_inner'] === 'Number' 
                              || (type['typed_array_inner'] === 'Null' && fixed_out['type'] === '*')))
                    {
                        if (type['typed_array_inner'] === 'Null')
                        {
                            slab.push(0);
                        }
                        else
                        {
                            slab.push(proc_args[i][0]);
                        }
                    }
                    else
                    {
                        throw {'error_type': 'wrapper', 'error_msg':
                               ("Incorrect type provided for argument " + (i+1) + " in call to wrapped C function '" + fname
                                + "': Expected a Number or an Array consisting of a single element which is a Number. "
                                + "Instead received type '" + type['actual'] + "'.")};
                    }
                });

                arg_sizes['fixed_in'].forEach(function(fixed_in)
                {
                    var i = fixed_in['index'];
                    var type = get_type(proc_args[i]);
                    if (type['actual'] === 'Number')
                    {
                        args[i] = proc_args[i];
                    }
                    else if (type['actual'] === 'Null' && fixed_in['type'] === '*')
                    {
                        args[i] = 0;
                    }
                    else
                    {
                        throw {'error_type': 'wrapper', 'error_msg':
                               ("Incorrect type provided for argument " + (i+1) + " in call to wrapped C function '" + fname
                                + "': Expected a Number. Instead received type '" + type['actual'] + "'.")};
                    }
                });

                var ptr = Module['allocate'](size, 'i8', Module['ALLOC_NORMAL']); // Allocate memory region needed for arguments
                Module['allocate'](slab, types, Module['ALLOC_NONE'], ptr); // Initialize fixed_out arguments

                var j = 0, k = 0;
                [8, 4, 2, 1].forEach(function(s)
                {
                    arg_sizes['var_out'][s].forEach(function(v)
                    {
                        var i = v['index'];
                        args[i] = ptr + var_out_offsets[j];
                        Module['allocate'](proc_args[i], 'i8', Module['ALLOC_NONE'], args[i]); // Initialize with ArrayBuffer
                        ++j;
                    });
                    arg_sizes['var_in'][s].forEach(function(v)
                    {
                        var i = v['index'];
                        args[i] = ptr + var_in_offsets[k];
                        Module['allocate'](proc_args[i], 'i8', Module['ALLOC_NONE'], args[i]); // Initialize with ArrayBuffer
                        ++k;
                    });
                })

                arg_sizes['fixed_out'].forEach(function(fixed_out)
                {
                    args[fixed_out['index']] = ptr + fixed_out['offset'];
                });

                var ret = null;
                var error = null;
                try
                {
                    ret = wrapper_func.apply(this, args); // Call C function
                }
                catch (err)
                {
                    // Do not throw immediately. Need to free allocated memory region first. 
                    error = err;
                }
                
                if (error === null) // Don't bother copying output values if there was an error
                {
                    var get_region = function(type_string, byteOffset, length) {
                        var r = null;
                        switch (type_string) {
                            case 'Int8Array':
                                r = new Int8Array(Module['HEAP8']['buffer'], byteOffset, length);
                                break;
                            case 'Uint8Array':
                                r = new Uint8Array(Module['HEAP8']['buffer'], byteOffset, length);
                                break;
                            case 'Uint8ClampedArray':
                                r = new Uint8ClampedArray(Module['HEAPU8']['buffer'], byteOffset, length);
                                break;
                            case 'Int16Array':
                                r = new Int16Array(Module['HEAP16']['buffer'], byteOffset, length);
                                break;
                            case 'Uint16Array':
                                r = new Uint16Array(Module['HEAPU16']['buffer'], byteOffset, length);
                                break;
                            case 'Int32Array':
                                r = new Int32Array(Module['HEAP32']['buffer'], byteOffset, length);
                                break;
                            case 'Uint32Array':
                                r = new Uint32Array(Module['HEAPU32']['buffer'], byteOffset, length);
                                break;
                            case 'Float32Array':
                                r = new Float32Array(Module['HEAPF32']['buffer'], byteOffset, length);
                                break;
                            case 'Float64Array':
                                r = new Float64Array(Module['HEAPF64']['buffer'], byteOffset, length);
                                break;
                        }
                        return r;
                    }
                    var j = 0;
                    [8, 4, 2, 1].forEach(function(s)
                    {
                        arg_sizes['var_out'][s].forEach(function(v)
                        {
                            var i = v['index'];
                            var type = get_type(proc_args[i]);
                            var region = get_region(type['actual'], ptr + var_out_offsets[j], proc_args[i].length);
                            if (region !== null)
                            {
                                proc_args[i].set(region);
                            }
                            ++j;
                        });
                    });
                    arg_sizes['fixed_out'].forEach(function(fixed_out)
                    {
                        var i = fixed_out['index'];
                        var type = get_type(proc_args[i]);
                        if (type['actual'] === 'Array')
                        {
                            proc_args[i][0] = getValue(ptr + fixed_out['offset'], fixed_out['type']);
                        }
                    });
                }
                
                Module['_free'](ptr); // Deallocate memory region

                if (error !== null)
                {

                    // Throw caught expection but distinguish from other exceptions in this function.
                    if (error.hasOwnProperty('message'))
                    {
                        // Hack to avoid DataCloneError. Avoid postMessage of the rest of the exception.
                        throw {'error_type': 'emscripten', 'error_msg': error['message']};
                    }
                    else
                    {
                        throw {'error_type': 'emscripten', 'error': error};
                    }
                }

                if (ret_type !== 'v')
                {
                    var type = get_type(ret);
                    switch (type['actual'])
                    {
                        case 'String':
                            if (ret_type !== 's')
                            {
                                throw {'error_type': 'wrapper', 'error_msg':
                                       ("Unexpected return type from wrapped C function '" + fname
                                        + "': Expected a Number compatible with return type code '" + ret_type
                                        + "'. Instead received a String.")};
                            }
                            break;
                        case 'Number':
                            switch(ret_type) 
                            {
                                case '8':
                                case '16':
                                case '32':
                                case 'f':
                                case 'd':
                                case 'p':
                                    break;
                                default:
                                    throw {'error_type': 'wrapper', 'error_msg':
                                           ("Unexpected return type from wrapped C function '" + fname
                                            + "': Expected a String. Instead received a Number.")};
                            }
                            break;
                        default:
                            throw {'error_type': 'wrapper', 'error_msg':
                                   ("Unexpected return type from wrapped C function '" + fname
                                    + "': Expected a type compatible with return type code '" + ret_type
                                    + "'. Instead received type '" + type['actual'] + "'.")};
                    }
                }
                
                return ret;
            };
        })(fname, wrapper_func, ret_type, arg_types.length, arg_sizes, types, initial_reserve_size, this.get_type);
    },
    wrap_error: function(err, error_type) {
        var error;
        if (err.hasOwnProperty('error_type'))
        {
            // Then this is almost certainly one of the exceptions explicitly thrown from the functions in this document.
            // Do very minimal wrapping of the exception.
            return {'error': err};                    
        }
        else
        {
            // Otherwise, properly wrap the plain exception and annotate with the appropriate error_type.
            return {'error': {'error_type': error_type, 'error_msg': err}};
        }
    },
    init: function() {
        for (var fname in this.C_api_spec)
        {
            if (this.C_api_spec.hasOwnProperty(fname))
            {
                this.C_api[fname] = this.wrap_function(fname);
            }
        }

        this.context = this.C_api['secp256k1_context_create'](1 << 0 | 1 << 1 | 1 << 7 | 1 << 8);
    },
    destroy: function() {
        if (!this.destroyed)
        {
            this.C_api['secp256k1_context_destroy'](this.context);
            this.context = null;
            this.destroyed = true;
        }
    },
    C_api: {}, // holds wrapped C functions
    context: null, // secp256k1 context
    initialized: false,
    destroyed: false,

    api_spec: {
    'ecdsa_recover': {
        'args': [{'name': 'msg',   'type': 'Uint8Array', 'out': false},
                 {'name': 'sig',   'type': 'Uint8Array', 'out': false},
                 {'name': 'recid', 'type': 'Number',     'out': false}],
        'func': function(args, return_buffers) {
                    var pubkeylen = [0];
                    var pubkey = new Uint8Array(33);
                    var ret = this.C_api['secp256k1_ecdsa_recover_compact']
                                         (this.context, args['msg'], args['sig'], pubkey, pubkeylen, 1, args['recid']);
                    switch(ret) {
                        case 1:
                            if (pubkeylen[0] !== 33)
                            {
                                throw "Length of computer compressed pubkey is " + pubkeylen[0] + " rather than 33.";
                            }
                            return_buffers.push(pubkey['buffer']);
                            return pubkey;
                        case 0:
                            throw  "Unable to recover public key";
                        default:
                            throw "Unknown return value: " + ret;
                    }
        }
    },
    'ecdsa_sign': {
        'args': [{'name': 'msg',    'type': 'Uint8Array', 'out': false},
                 {'name': 'seckey', 'type': 'Uint8Array', 'out': false}],
        'func': function(args, return_buffers) {
                    var recid = [0];
                    var sig = new Uint8Array(64);
                    var ret = this.C_api['secp256k1_ecdsa_sign_compact']
                                         (this.context, args['msg'], sig, args['seckey'], null, null, recid);
                    switch(ret) {
                        case 1:
                            return_buffers.push(sig['buffer']);
                            return {'sig': sig, 'recid': recid[0]};
                        case 0:
                            throw "Unable to sign";
                        default:
                            throw "Unknown return value: " + ret;
                    }
        }
    },
    'point': {
        'args': [{'name': 'seckey', 'type': 'Uint8Array', 'out': false}],
        'func': function(args, return_buffers) {
                    var pubkeylen = [33];
                    var pubkey = new Uint8Array(33);
                    var ret = this.C_api['secp256k1_ec_pubkey_create']
                                         (this.context, pubkey, pubkeylen, args['seckey'], 1);
                    switch(ret) {
                        case 1:
                            if (pubkeylen[0] !== 33)
                            {
                                throw "Length of computed compressed pubkey is " + pubkeylen[0] + " rather than 33.";
                            }
                            return_buffers.push(pubkey['buffer']);
                            return pubkey;
                        case 0:
                                throw "Secret key is invalid";
                        default:
                                throw "Unknown return value: " + ret;
                    }
        }
    },
    'verify_seckey': {
        'args': [{'name': 'seckey', 'type': 'Uint8Array', 'out': false}],
        'func': function(args) {
                    var ret = this.C_api['secp256k1_ec_seckey_verify']
                                         (this.context, args['seckey']);
                    switch(ret) {
                        case 1:
                            return true;
                        case 0:
                            return false;
                        default:
                            throw "Unknown return value: " + ret;
                    }
        }
    },
    'scalar_set': {
        'args': [{'name': 'bin', 'type': 'Uint8Array', 'out': false}],
        'func': function(args, return_buffers) {
                    var overflow = [0];
                    var scalar = new Uint8Array(32);
                    this.C_api['secp256k1_scalar_set_b32'](scalar, args['bin'], overflow);
                    return_buffers.push(scalar['buffer']);
                    return {'scalar': scalar, 'overflow': (overflow[0] == 0) ? false : true};
        }
    },

    }
};

Module = {};
Module['noInitialRun']  = true;
Module['noExitRuntime'] = true;
Module['onRuntimeInitialized'] = function() {
    try
    {
        libsecp256k1.init();
    }
    catch(err)
    {
        postMessage(libsecp256k1.wrap_error(err, 'inner_api'));
        return;
    }
    var functions = {};
    for (fname in libsecp256k1.api_spec)
    {
        if (libsecp256k1.api_spec.hasOwnProperty(fname))
        {
            functions[fname] = libsecp256k1.api_spec[fname]['args'];
        }
    }
    postMessage({'error': null, 'type': 'init_complete', 'inner_api': functions});
    libsecp256k1.initialized = true;
};

onmessage = function(event) {
    var data = event['data'];
    if (data instanceof ArrayBuffer)
    {
        // Assuming this is the first message by init that was just to test Transferable Object support.
        // Just ignore the message.
        return; 
    }
    if (!libsecp256k1.initialized)
    {
        postMessage({'error': {'error_type': 'dispatch', 'error_msg': "libsecp256k1 has not been initialized yet"}});
        return;
    }
    if (!data.hasOwnProperty('operation'))
    {
        postMessage({'error': {'error_type': 'dispatch', 'error_msg': "Invalid request: No operation provided"}});
        return;
    }
    switch(data['operation'])
    {
        case 'destroy':
            try
            {
                libsecp256k1.destroy();
            }
            catch(err)
            {
                postMessage(libsecp256k1.wrap_error(err, 'inner_api'));
                return;
            }
            postMessage({'error': null, 'type': 'destroy_complete'});
            return;
        case 'call':
            if (!data.hasOwnProperty('procedure'))
            {
                postMessage({'error': {'error_type': 'dispatch', 
                                       'error_msg': "Invalid call request: Procedure not provided with call operation"}});
                return;
            }
            if (!libsecp256k1.api_spec.hasOwnProperty(data['procedure']))
            {
                postMessage({'error': {'error_type': 'dispatch',
                                       'error_msg': "Invalid call request: Procedure named '" + data['procedure'] + "' does not exist"}});
                return;
            }
            if (libsecp256k1.destroyed)
            {
                postMessage({'error': {'error_type': 'dispatch', 
                                       'error_msg': "Cannot proceed with call request: libsecp256k1 has been destroyed"}});
                return;
            }

            var ret = null;
            var buffers = [];
            var proc = libsecp256k1.api_spec[data['procedure']];
            var args = data['args'];
            try
            {
                ret = proc['func'].call(libsecp256k1, args, buffers);
            }
            catch (err)
            {
                postMessage(libsecp256k1.wrap_error(err, 'inner_api'));
                return;
            }
            // Copy values to be updated into update_args to be returned with message. 
            var update_args = {};
            var proc_spec_args = proc['args'];
            for (var i = 0, l = proc_spec_args.length; i < l; ++i)
            {
                var proc_arg_spec = proc_spec_args[i];
                var arg_name = proc_arg_spec['name'];
                var type = libsecp256k1.get_type(args[arg_name]);
                if (type['actual'] !== 'Array' && type['typed_array_inner'] !== null)
                {
                    // This is a TypedArray. So I need to add it to the buffer.
                    buffers.push(args[arg_name]['buffer']);
                    update_args[arg_name] = args[arg_name];
                }
                else if (proc_arg_spec['out'] && proc_arg_spec['type'] === 'Number')
                {
                    update_args[arg_name] = args[arg_name][0];
                }
            }
            postMessage({'error': null, 'type': 'call_return', 
                         'update_args': update_args, 'return': ret}, buffers); 
            return;
        default:
            postMessage({'error': {'error_type': 'dispatch', 
                                   'error_msg': "Invalid request: Protocol does not support operation '" + data['operation'] + "'"}});
            return;
    }
}

} else {
// Not in Web Worker
throw 'This script needs to run in a Web Worker.';
}


