UPDATE appMetadata
SET value = '0.0.1'
WHERE id = 'version';

UPDATE appMetadata
SET value = '-i test.vcf -d'
WHERE id = 'appArguments';

UPDATE appMetadata
SET value = '{"genomeAssembly": "GRCh38","htsFormat": "VCF","uri": "trio.vcf"}'
WHERE id = 'htsFile';