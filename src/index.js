"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.ApiEncodedDataNode = exports.ApiResource = exports.ApiEncodedData = exports.ApiData = exports.ApiMetadata = exports.ApiReportData = exports.VcfParser = exports.Vcf = void 0;
var ascii85_1 = require("ascii85");
var fflate_1 = require("fflate");
var api_1 = require("@/api");
exports.ApiReportData = api_1.ApiReportData;
exports.ApiMetadata = api_1.ApiMetadata;
exports.ApiData = api_1.ApiData;
exports.ApiEncodedData = api_1.ApiEncodedData;
exports.ApiResource = api_1.ApiResource;
exports.ApiEncodedDataNode = api_1.ApiEncodedDataNode;
var VcfParser_1 = require("@/VcfParser");
exports.Vcf = VcfParser_1.Vcf;
exports.VcfParser = VcfParser_1.VcfParser;
var Api = /** @class */ (function () {
    function Api(apiReportData) {
        this.apiReportData = apiReportData;
        this.reportData = decode(apiReportData);
    }
    Api.prototype.getMeta = function () {
        return Promise.resolve(this.reportData.metadata);
    };
    Api.prototype.get = function (resource, params) {
        var _this = this;
        if (params === void 0) { params = {}; }
        return new Promise(function (resolve, reject) {
            if (!_this.reportData.data[resource]) {
                reject("unknown resource '" + resource + "'");
            }
            var resources = _this.reportData.data[resource].items.slice();
            var query = params.query;
            if (query) {
                resources = resources.filter(function (aResource) { return matches(query, aResource); });
            }
            if (params.sort) {
                sort(resources, Array.isArray(params.sort) ? params.sort : [params.sort]);
            }
            var page = params.page ? params.page : 0;
            var size = params.size ? params.size : 10;
            var totalElements = resources.length;
            resources = resources.slice(page * size, page * size + size);
            var response = {
                items: resources,
                page: {
                    number: page,
                    size: size,
                    totalElements: totalElements
                },
                total: _this.reportData.data[resource].total
            };
            resolve(response);
        });
    };
    Api.prototype.getRecords = function (params) {
        if (params === void 0) { params = {}; }
        return this.get('records', params);
    };
    Api.prototype.getSamples = function (params) {
        if (params === void 0) { params = {}; }
        return this.get('samples', params);
    };
    Api.prototype.getPhenotypes = function (params) {
        if (params === void 0) { params = {}; }
        return this.get('phenotypes', params);
    };
    Api.prototype.getVcfGz = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.reportData.binary.vcfGz];
            });
        });
    };
    return Api;
}());
exports["default"] = Api;
var base85 = new ascii85_1["default"].Ascii85({
    table: [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
        '!',
        '#',
        '$',
        '%',
        '&',
        '(',
        ')',
        '*',
        '+',
        '-',
        ';',
        '<',
        '=',
        '>',
        '?',
        '@',
        '^',
        '_',
        '`',
        '{',
        '|',
        '}',
        '~',
    ]
});
function get(value, path) {
    var valueAtDepth = value;
    for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
        var token = path_1[_i];
        if (valueAtDepth === undefined) {
            valueAtDepth = null;
        }
        else if (valueAtDepth !== null) {
            if (typeof valueAtDepth !== 'object' || Array.isArray(valueAtDepth)) {
                throw new Error("invalid path " + path);
            }
            valueAtDepth = valueAtDepth[token];
        }
    }
    return valueAtDepth !== undefined ? valueAtDepth : null;
}
function compareAsc(a, b) {
    if (a === null) {
        return b === null ? 0 : 1;
    }
    else if (b === null) {
        return -1;
    }
    else if (typeof a === 'number' && typeof b === 'number') {
        return compareAscNumber(a, b);
    }
    else if (typeof a === 'string' && typeof b === 'string') {
        return compareAscString(a, b);
    }
    else if (typeof a === 'boolean' && typeof b === 'boolean') {
        return compareAscBoolean(a, b);
    }
    else {
        var type = typeof a;
        throw new Error("can't compare values of type '" + type + "'. consider providing a custom compare function.");
    }
}
function compareAscNumber(a, b) {
    return a - b;
}
function compareAscString(a, b) {
    return a.toUpperCase().localeCompare(b.toUpperCase());
}
function compareAscBoolean(a, b) {
    if (a === b) {
        return 0;
    }
    else {
        return a ? -1 : 1;
    }
}
function compareDesc(a, b) {
    return compareAsc(b, a);
}
function getCompareFn(sortOrder) {
    var compareFn;
    if (sortOrder.compare === 'asc' || sortOrder.compare === null || sortOrder.compare === undefined) {
        compareFn = compareAsc;
    }
    else if (sortOrder.compare === 'desc') {
        compareFn = compareDesc;
    }
    else if (typeof sortOrder.compare === 'function') {
        compareFn = sortOrder.compare;
    }
    else {
        throw new Error("illegal sort compare value '" + sortOrder.compare + "'. valid values are 'asc', 'desc' or a function (a, b) => number");
    }
    return compareFn;
}
function sort(resources, sortOrders) {
    resources.sort(function (a, b) {
        var val = 0;
        for (var _i = 0, sortOrders_1 = sortOrders; _i < sortOrders_1.length; _i++) {
            var sortOrder = sortOrders_1[_i];
            var path = Array.isArray(sortOrder.property) ? sortOrder.property : [sortOrder.property];
            var left = get(a, path);
            var right = get(b, path);
            val = getCompareFn(sortOrder)(left, right);
            if (val !== 0) {
                break;
            }
        }
        return val;
    });
}
function matchesAnd(args, resource) {
    for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
        var query = args_1[_i];
        if (!matches(query, resource)) {
            return false;
        }
    }
    return true;
}
function matchesOr(args, resource) {
    for (var _i = 0, args_2 = args; _i < args_2.length; _i++) {
        var query = args_2[_i];
        if (matches(query, resource)) {
            return true;
        }
    }
    return false;
}
function matchesComposed(composedQuery, resource) {
    var match;
    switch (composedQuery.operator) {
        case 'and':
            match = matchesAnd(composedQuery.args, resource);
            break;
        case 'or':
            match = matchesOr(composedQuery.args, resource);
            break;
        default:
            throw new Error("invalid operator '" + composedQuery.operator + "'");
    }
    return match;
}
function matches(query, resource) {
    if (query.operator === 'and' || query.operator === 'or') {
        return matchesComposed(query, resource);
    }
    else {
        var match = void 0;
        switch (query.operator) {
            case '==':
                match = matchesEquals(query, resource);
                break;
            case 'in':
                match = matchesIn(query, resource);
                break;
            case 'has_any':
                match = matchesHasAny(query, resource);
                break;
            case '!has_any':
                match = !matchesHasAny(query, resource);
                break;
            case 'any_has_any':
                match = matchesAnyHasAny(query, resource);
                break;
            case '!any_has_any':
                match = !matchesAnyHasAny(query, resource);
                break;
            case '!=':
                match = !matchesEquals(query, resource);
                break;
            case '!in':
                match = !matchesIn(query, resource);
                break;
            case '>':
                match = matchesGreaterThan(query, resource);
                break;
            case '>=':
                match = matchesGreaterThanOrEqual(query, resource);
                break;
            case '<':
                match = matchesLesserThan(query, resource);
                break;
            case '<=':
                match = matchesLesserThanOrEqual(query, resource);
                break;
            default:
                throw new Error('unexpected query operator ' + query.operator);
        }
        return match;
    }
}
function matchesEquals(query, resource) {
    var value = select(query.selector, resource);
    return value === query.args;
}
function matchesIn(query, resource) {
    var value = select(query.selector, resource);
    var match = false;
    if (Array.isArray(query.args)) {
        for (var _i = 0, _a = query.args; _i < _a.length; _i++) {
            var arg = _a[_i];
            if (value === arg) {
                match = true;
                break;
            }
        }
    }
    return match;
}
function matchesAnyHasAny(query, resource) {
    var value = select(query.selector, resource);
    if (value === undefined) {
        return false;
    }
    if (!Array.isArray(value)) {
        throw new Error("value '" + value + "' is of type '" + typeof value + "' instead of 'array'");
    }
    var match = false;
    for (var _i = 0, _a = value; _i < _a.length; _i++) {
        var item = _a[_i];
        for (var _b = 0, _c = query.args; _b < _c.length; _b++) {
            var arg = _c[_b];
            if (item.includes(arg)) {
                match = true;
                break;
            }
        }
    }
    return match;
}
function matchesHasAny(query, resource) {
    var value = select(query.selector, resource);
    if (value === undefined) {
        return false;
    }
    if (!Array.isArray(value)) {
        throw new Error("value '" + value + "' is of type '" + typeof value + "' instead of 'array'");
    }
    var match = false;
    for (var _i = 0, _a = query.args; _i < _a.length; _i++) {
        var arg = _a[_i];
        if (value.includes(arg)) {
            match = true;
            break;
        }
    }
    return match;
}
function matchesGreaterThan(query, resource) {
    var value = select(query.selector, resource);
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value !== 'number') {
        throw new Error("value '" + value + "' is of type '" + typeof value + "' instead of 'number'");
    }
    return value > query.args;
}
function matchesGreaterThanOrEqual(query, resource) {
    var value = select(query.selector, resource);
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value !== 'number') {
        throw new Error("value '" + value + "' is of type '" + typeof value + "' instead of 'number'");
    }
    return value >= query.args;
}
function matchesLesserThan(query, resource) {
    var value = select(query.selector, resource);
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value !== 'number') {
        throw new Error("value '" + value + "' is of type '" + typeof value + "' instead of 'number'");
    }
    return value < query.args;
}
function matchesLesserThanOrEqual(query, resource) {
    var value = select(query.selector, resource);
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value !== 'number') {
        throw new Error("value '" + value + "' is of type '" + typeof value + "' instead of 'number'");
    }
    return value <= query.args;
}
function select(selector, resource) {
    var parts;
    if (Array.isArray(selector)) {
        parts = selector.slice();
    }
    else {
        parts = [selector];
    }
    return selectRecursive(parts, resource);
}
function selectRecursive(parts, value) {
    if (parts.length === 0) {
        throw new Error("expected selector part");
    }
    var part = parts.shift();
    var selectedValue;
    if (part === '*') {
        if (value === undefined) {
            selectedValue = [];
        }
        else if (!Array.isArray(value)) {
            throw new Error("value is of type '" + typeof value + "' instead of array");
        }
        else {
            selectedValue = value.map(function (item) { return selectRecursive(parts.slice(), item); });
        }
    }
    else {
        if (typeof part === 'string') {
            selectedValue = selectFromObject(part, value);
        }
        else if (Number.isInteger(part)) {
            selectedValue = selectFromArray(part, value);
        }
        else {
            throw new Error("part type '" + typeof part + "' is not a 'string' or 'number'");
        }
        if (parts.length > 0) {
            selectedValue = selectRecursive(parts, selectedValue);
        }
    }
    return selectedValue;
}
function decode(apiData) {
    var reportData = {
        metadata: apiData.metadata,
        data: apiData.data,
        binary: base85ToBinary(apiData.base85)
    };
    var binaryVcf = fflate_1.gunzipSync(reportData.binary.vcfGz);
    var vcf = new VcfParser_1.VcfParser(binaryVcf).parse();
    reportData.metadata.records = {
        info: Object.values(vcf.infoMap),
        format: Object.values(vcf.formatMap)
    };
    reportData.data.records = {
        items: vcf.records,
        total: vcf.records.length
    };
    return reportData;
}
function base85ToBinary(obj) {
    var binaryObj = {};
    for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        switch (typeof value) {
            case 'string':
                binaryObj[key] = base85.decode(value);
                delete obj.key; // release memory as soon as possible
                break;
            case 'object':
                binaryObj[key] = base85ToBinary(value);
                delete obj.key; // release memory as soon as possible
                break;
            default:
                throw new Error("unexpected type '" + typeof value + "'");
        }
    }
    return binaryObj;
}
function selectFromObject(part, value) {
    if (typeof value !== 'object') {
        throw new Error("value '" + value + "' is of type '" + typeof value + "' instead of 'object'");
    }
    return value !== null ? value[part] : null;
}
function selectFromArray(part, value) {
    if (!Array.isArray(value)) {
        throw new Error("value is of type '" + typeof value + "' instead of array");
    }
    return value[part];
}
