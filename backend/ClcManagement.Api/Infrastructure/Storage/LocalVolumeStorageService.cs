namespace ClcManagement.Api.Infrastructure.Storage;

public class LocalVolumeStorageService : IStorageService
{
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

    private static readonly Dictionary<string, string[]> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/png"] = [".png"],
        ["image/jpeg"] = [".jpg", ".jpeg"],
        ["image/webp"] = [".webp"]
    };

    private readonly string _rootPath;

    public LocalVolumeStorageService(IConfiguration configuration, IWebHostEnvironment env)
    {
        var configured = configuration["Storage:RootPath"] ?? configuration["STORAGE_ROOT_PATH"];
        _rootPath = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "uploads", "posters")
            : configured;
        Directory.CreateDirectory(_rootPath);
    }

    public async Task<StoredFileResult> UploadAsync(
        Stream content,
        string originalFileName,
        string contentType,
        Guid campusId,
        Guid eventId,
        CancellationToken ct = default)
    {
        if (!AllowedContentTypes.TryGetValue(contentType, out var allowedExts))
            throw new InvalidOperationException("Unsupported file type. Allowed formats: PNG, JPEG, WebP.");

        var ext = Path.GetExtension(originalFileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !allowedExts.Contains(ext))
            throw new InvalidOperationException("File extension does not match allowed image formats.");

        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, ct);
        if (ms.Length == 0 || ms.Length > MaxFileSizeBytes)
            throw new InvalidOperationException("Poster file must be between 1 byte and 5 MB.");

        var bytes = ms.ToArray();
        if (!HasValidImageMagicBytes(bytes, contentType))
            throw new InvalidOperationException("File content does not match its declared image type.");

        var safeFileName = $"{Guid.NewGuid():N}{ext}";
        var relativeKey = $"{campusId:D}/{eventId:D}/{safeFileName}";
        var fullPath = Path.Combine(_rootPath, campusId.ToString("D"), eventId.ToString("D"), safeFileName);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await File.WriteAllBytesAsync(fullPath, bytes, ct);

        return new StoredFileResult(
            StorageKey: relativeKey,
            FileName: Path.GetFileName(originalFileName),
            ContentType: contentType,
            FileSizeBytes: bytes.LongLength
        );
    }

    public Task DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        var sanitized = storageKey.Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(_rootPath, sanitized));
        var rootFull = Path.GetFullPath(_rootPath);

        if (fullPath.StartsWith(rootFull, StringComparison.OrdinalIgnoreCase) && File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }

    public string GetPublicUrl(string storageKey) => $"/uploads/posters/{storageKey}";

    private static bool HasValidImageMagicBytes(byte[] bytes, string contentType)
    {
        if (bytes.Length < 12) return false;

        return contentType.ToLowerInvariant() switch
        {
            "image/png" => bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47,
            "image/jpeg" => bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
            "image/webp" => bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
                            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50,
            _ => false
        };
    }
}
