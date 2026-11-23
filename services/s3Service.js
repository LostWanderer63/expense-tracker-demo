// Uploads files to AWS S3 and hands back a short-lived download link.
// The bucket stays private: files are only reachable through signed URLs.
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const env = require("../config/env");

let client = null;
function getClient() {
  if (!client) {
    client = new S3Client({
      region: env.aws.region,
      credentials: {
        accessKeyId: env.aws.accessKeyId,
        secretAccessKey: env.aws.secretAccessKey,
      },
    });
  }
  return client;
}

function isConfigured() {
  return Boolean(env.aws.accessKeyId && env.aws.secretAccessKey && env.aws.bucket);
}

/**
 * Upload `body` to S3 under `key`, then return a signed URL that downloads it
 * as `downloadName`. The URL expires after S3_URL_EXPIRES_SECONDS.
 */
async function uploadAndGetUrl({ key, body, contentType, downloadName }) {
  const s3 = getClient();

  await s3.send(
    new PutObjectCommand({
      Bucket: env.aws.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.aws.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${downloadName}"`,
    }),
    { expiresIn: env.aws.urlExpiresSeconds }
  );
}

module.exports = { isConfigured, uploadAndGetUrl };
