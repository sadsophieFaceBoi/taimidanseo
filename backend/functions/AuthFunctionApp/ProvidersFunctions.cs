using System.Net;
using System.Threading.Tasks;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

public class ProvidersFunctions
{
    private readonly AuthProviderSettings _settings;

    public ProvidersFunctions(AuthProviderSettings settings)
    {
        _settings = settings;
    }

    [Function("AuthProviders")]
    public async Task<HttpResponseData> GetProviders(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "auth/providers")] HttpRequestData req)
    {
        var resp = req.CreateResponse(HttpStatusCode.OK);
        await resp.WriteAsJsonAsync(new
        {
            googleClientId = _settings.GoogleClientId,
            microsoftClientId = _settings.MicrosoftClientId,
            facebookAppId = _settings.FacebookAppId
        });
        return resp;
    }
}