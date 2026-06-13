import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, s3Bucket } from '../lib/s3.js';
import { formRepository } from '../repositories/form.repository.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { membershipRepository } from '../repositories/membership.repository.js';

export const uploadService = {
  presignUpload: async (
    userId: string,
    formId: string,
    filename: string,
    contentType: string
  ) => {
    const form = await formRepository.findById(formId);
    if (!form) throw NotFoundError('Form not found');
    const membership = await membershipRepository.findByUserAndWorkspace(
      userId,
      form.workspaceId
    );
    if (!membership) throw ForbiddenError();
    const workspaceId = form.workspaceId;

    const fileKey = `uploads/${workspaceId}/${formId}/${uuidv4()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: fileKey,
      ContentType: contentType
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    return { uploadUrl, fileKey };
  }
};
