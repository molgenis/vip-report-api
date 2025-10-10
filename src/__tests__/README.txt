To generate the test database:

use vip-report with these parameters:
-i "path/to/vip-report-api/src/__tests__/trio.vcf" -f -pb Patient -m "path/to/vip-report-api/src/__tests__/customMeta.json" -tc "path/to/config_vcf.json" -st "path/to/vip-report-api/src/__tests__/sampleTree.json" -dt "path/to/vip-report-api/src/__tests__/decisionTree.json" -t "path/to/index.html"

run 'fixMetadata.sql' to remove local paths and create the correct metadata for the test cases