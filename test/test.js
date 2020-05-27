const assert = require('chai').assert
const Api = require('../index.js')
const {describe} = require("mocha");

describe('getMeta', function () {
    const reportData = {
        metadata: {
            "appName": "vcf-report",
            "appVersion": "0.0.1",
            "appArgs": "-i test.vcf -d"
        }
    }
    const api = new Api(reportData)

    it('should return metadata', async function () {
        const metadata = await api.getMeta()
        assert.deepEqual(metadata, {
                "appName": "vcf-report",
                "appVersion": "0.0.1",
                "appArgs": "-i test.vcf -d"
            }
        )
    });
});

describe('get', function () {

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
    const api = new Api(reportData)

    it('should return all samples', async function () {
        const samples = await api.get('samples')
        assert.deepEqual(samples, {
                items: [{name: 'Patient'}, {name: 'Mother'}, {name: 'Father'}],
                page: {number: 0, size: 10, totalElements: 3},
                total: 3
            }
        )
    });

    it('should return all records', async function () {
        const records = await api.get('records')
        assert.deepEqual(records, {
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

    it('should throw an error when the resource is unknown', async function () {
        try {
            await api.get('unknown')
        } catch (err) {
            assert.equal(err, 'unknown resource \'unknown\'')
        }
    });
});