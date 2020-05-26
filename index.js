module.exports = class Api {
    constructor(reportData) {
        this.reportData = reportData;
    }

    getMeta() {
        return new Promise(resolve => {
            resolve(this.reportData.metadata)
        })
    }

    get(resource, params = {}) {
        return new Promise((resolve, reject) => {
            if (!this.reportData.data[resource]) {
                reject(`unknown resource '${resource}'`)
            }

            let resources = this.reportData.data[resource].items.slice()
            if (params.query) {
                resources = resources.filter(resource => matches(params.query, resource))
            }
            if (params.sort) {
                const prop = params.sort
                const desc = !!params.desc
                resources.sort((a, b) => {
                    if (desc) {
                        let tmp = a
                        a = b
                        b = tmp
                    }

                    const valA = a[prop]
                    const valB = b[prop]
                    if (valA === undefined) {
                        return valB === undefined ? 0 : -1
                    } else if (valB === undefined) {
                        return 1
                    } else if (typeof valA === 'number') {
                        return valA - valB
                    } else {
                        return valA.toUpperCase() < valB.toUpperCase()
                    }
                })
            }
            const page = params.page ? params.page : 0
            const size = params.size ? params.size : 10
            resources = resources.slice(page * size, (page * size) + size)

            const response = {
                items: resources,
                page: {
                    number: page,
                    size: size,
                    totalElements: this.reportData.data[resource].items.length
                },
                total: this.reportData.data[resource].total
            }
            resolve(response)
        })
    }
}

function matches(query, resource) {
    let matches
    switch (query.operator) {
        case '==':
            matches = matchesEquals(query, resource)
            break
        case 'in':
            matches = matchesIn(query, resource)
            break
        case '!=':
            matches = !matchesEquals(query, resource)
            break
        case '!in':
            matches = !matchesIn(query, resource)
            break
        default:
            throw 'unexpected query operator ' + query.operator
    }
    return matches
}

function matchesEquals(query, resource) {
    let value = resource
    if (Array.isArray(query.selector)) {
        for (const part of query.selector) {
            value = value[part]
        }
    } else {
        value = resource[query.selector]
    }
    return value === query.args
}

function matchesIn(query, resource) {
    let value = resource
    if (Array.isArray(query.selector)) {
        for (const part of query.selector) {
            value = value[part]
        }
    } else {
        value = resource[query.selector]
    }

    let matches = false
    for (const arg of query.args) {
        if (value === arg) {
            matches = true
            break
        }
    }
    return matches
}

