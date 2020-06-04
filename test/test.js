const Api = require('../index.js')

let api

beforeEach(() => {
    const reportData = {
        "metadata": {
            "appName": "vcf-report",
            "appVersion": "0.0.1",
            "appArgs": "-i test.vcf -d"
        },
        "data": {
            "samples": {
                "items": [{
                    "name": "Patient"
                }, {
                    "name": "Mother"
                }, {
                    "name": "Father"
                }],
                "total": 3
            },
            "records": {
                "items": [{
                    "c": "1",
                    "p": 10042538,
                    "i": ["rs123"],
                    "r": "C",
                    "a": ["T"],
                    "s": [{
                        "gt": {
                            "a": ["T", "C"],
                            "p": true,
                            "t": "het"
                        }
                    }, {
                        "gt": {
                            "a": ["C", "C"],
                            "p": true,
                            "t": "hom_r"
                        }
                    }, {
                        "gt": {
                            "a": ["C", "C"],
                            "p": true,
                            "t": "hom_r"
                        }
                    }]
                }],
                "total": 32
            }
        }
    }
    api = new Api(reportData)
});

test('getMeta', async () => {
    const metadata = await api.getMeta()
    expect(metadata).toEqual({
        "appName": "vcf-report",
        "appVersion": "0.0.1",
        "appArgs": "-i test.vcf -d"
    })
});

test('get - all samples', async () => {
    const samples = await api.get('samples')
    expect(samples).toEqual({
        items: [{name: 'Patient'}, {name: 'Mother'}, {name: 'Father'}],
        page: {number: 0, size: 10, totalElements: 3},
        total: 3
    })
});

test('get - all records', async () => {
    const records = await api.get('records')
    expect(records).toEqual({
        items: [{
            "c": "1",
            "p": 10042538,
            "i": ["rs123"],
            "r": "C",
            "a": ["T"],
            "s": [{
                "gt": {
                    "a": ["T", "C"],
                    "p": true,
                    "t": "het"
                }
            }, {
                "gt": {
                    "a": ["C", "C"],
                    "p": true,
                    "t": "hom_r"
                }
            }, {
                "gt": {
                    "a": ["C", "C"],
                    "p": true,
                    "t": "hom_r"
                }
            }]
        }],
        page: {number: 0, size: 10, totalElements: 1},
        total: 32
    })
});

test('get - unknown resource', async () => {
    try {
        await api.get('unknown')
    } catch (err) {
        expect(err).toEqual('unknown resource \'unknown\'')
    }
});