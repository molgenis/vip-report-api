export default class Api {
    constructor(reportData) {
        this.reportData = reportData;
        this.reportData = reportData;
    }
    getMeta() {
        return new Promise(resolve => {
            resolve(this.reportData.metadata);
        });
    }
    get(resource, params = {}) {
        return new Promise((resolve, reject) => {
            if (!this.reportData.data[resource]) {
                reject(`unknown resource '${resource}'`);
            }
            let resources = this.reportData.data[resource].items.slice();
            const query = params.query;
            if (query) {
                resources = resources.filter(aResource => matches(query, aResource));
            }
            if (params.sort) {
                const prop = params.sort;
                const desc = !!params.desc;
                resources.sort((a, b) => {
                    if (desc) {
                        let tmp = a;
                        a = b;
                        b = tmp;
                    }
                    const valA = a[prop];
                    const valB = b[prop];
                    if (valA === undefined) {
                        return valB === undefined ? 0 : -1;
                    }
                    else if (valB === undefined) {
                        return 1;
                    }
                    else if (typeof valA === 'number') {
                        return valA - valB;
                    }
                    else {
                        return valA.toUpperCase().localeCompare(valB.toUpperCase());
                    }
                });
            }
            const page = params.page ? params.page : 0;
            const size = params.size ? params.size : 10;
            resources = resources.slice(page * size, (page * size) + size);
            const response = {
                items: resources,
                page: {
                    number: page,
                    size: size,
                    totalElements: this.reportData.data[resource].items.length
                },
                total: this.reportData.data[resource].total
            };
            resolve(response);
        });
    }
    getRecords(params = {}) {
        return this.get('records', params);
    }
    getSamples(params = {}) {
        return this.get('samples', params);
    }
    getPhenotypes(params = {}) {
        return this.get('phenotypes', params);
    }
}
function matches(query, resource) {
    let match;
    switch (query.operator) {
        case '==':
            match = matchesEquals(query, resource);
            break;
        case 'in':
            match = matchesIn(query, resource);
            break;
        case '!=':
            match = !matchesEquals(query, resource);
            break;
        case '!in':
            match = !matchesIn(query, resource);
            break;
        default:
            throw 'unexpected query operator ' + query.operator;
    }
    return match;
}
function matchesEquals(query, resource) {
    let value = resource;
    if (Array.isArray(query.selector)) {
        for (const part of query.selector) {
            value = value[part];
        }
    }
    else {
        value = resource[query.selector];
    }
    return value === query.args;
}
function matchesIn(query, resource) {
    let value = resource;
    if (Array.isArray(query.selector)) {
        for (const part of query.selector) {
            value = value[part];
        }
    }
    else {
        value = resource[query.selector];
    }
    let match = false;
    if (Array.isArray(query.args)) {
        for (const arg of query.args) {
            if (value === arg) {
                match = true;
                break;
            }
        }
    }
    return match;
}
//# sourceMappingURL=api.js.map