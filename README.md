[![Build Status](https://travis-ci.org/molgenis/vip-report-api.svg?branch=master)](https://travis-ci.org/molgenis/vip-report-api)
[![Quality Status](https://sonarcloud.io/api/project_badges/measure?project=molgenis_vip-report-api&metric=alert_status)](https://sonarcloud.io/dashboard?id=molgenis_vip-report-api)
# Variant Interpretation Pipeline - VCF Report Generator
See https://github.com/molgenis/vip-report#readme

## Report API
JavaScript Report API that can be used to query report data in a report template to generate reports for any VCF (Variant Call Format) file.

### Install
```
npm install @molgenis/vip-report-api --save 
```
### Usage
```javascript
import Api from '@molgenis/vip-report-api'

const api = new Api({ /* <report data> */})

api.getMetadata().then(metadata => console.log(metadata))
api.get('samples').then(samples => console.log(samples))
api.get('records').then(records => console.log(records))
```
..
