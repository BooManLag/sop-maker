/** The one place that knows how media objects are laid out in storage. */
export const mediaPaths = {
  recording: (organizationId: string, processId: string, uploadId: string) =>
    `quarantine/${organizationId}/${processId}/${uploadId}`,
  frame: (organizationId: string, processId: string, uploadId: string) =>
    `quarantine/${organizationId}/${processId}/frames/${uploadId}`,
  clean: (quarantinePath: string) => quarantinePath.replace(/^quarantine\//, 'clean/'),
  /** Tenant that owns a quarantined object, or undefined for any other path. */
  owner(objectPath: string) {
    const [area, organizationId] = objectPath.split('/');
    return area === 'quarantine' && organizationId ? organizationId : undefined;
  },
};
