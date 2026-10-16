/** The one place that knows how media objects are laid out in storage. */
export const mediaPaths = {
  recording: (organizationId: string, processId: string, uploadId: string) =>
    `quarantine/${organizationId}/${processId}/${uploadId}`,
  frame: (organizationId: string, processId: string, uploadId: string) =>
    `quarantine/${organizationId}/${processId}/frames/${uploadId}`,
  /** Step images of a published version, outside the expiring quarantine and clean areas. */
  published: (organizationId: string, processId: string, version: number, stepId: string) =>
    `published/${organizationId}/${processId}/v${version}/${stepId}`,
  clean: (quarantinePath: string) => quarantinePath.replace(/^quarantine\//, 'clean/'),
  /** Tenant that owns a quarantined object, or undefined for any other path. */
  owner(objectPath: string) {
    const [area, organizationId] = objectPath.split('/');
    return area === 'quarantine' && organizationId ? organizationId : undefined;
  },
};
