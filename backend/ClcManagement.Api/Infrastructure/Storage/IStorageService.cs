namespace ClcManagement.Api.Infrastructure.Storage;

public record StoredFileResult(string StorageKey, string FileName, string ContentType, long FileSizeBytes);

public interface IStorageService
{
    Task<StoredFileResult> UploadAsync(
        Stream content,
        string originalFileName,
        string contentType,
        Guid campusId,
        Guid eventId,
        CancellationToken ct = default);

    Task DeleteAsync(string storageKey, CancellationToken ct = default);
    string GetPublicUrl(string storageKey);
}
