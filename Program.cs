using Microsoft.Extensions.FileProviders;


var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();


var webRoot = Path.Combine(
    builder.Environment.ContentRootPath,
    "Semestral",
    "syta"
);

app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = new PhysicalFileProvider(webRoot)
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRoot)
});



app.Run();
