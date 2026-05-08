using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Reflection;

namespace SudokuLootDesktopHost;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new GameHostForm());
    }
}

internal sealed class GameHostForm : Form
{
    private const string LocalAppHostName = "sudoku-loot.local";
    private readonly WebView2 webView = new() { Dock = DockStyle.Fill };

    public GameHostForm()
    {
        Text = BuildWindowTitle();
        StartPosition = FormStartPosition.CenterScreen;
        Width = 1280;
        Height = 800;
        MinimumSize = new Size(960, 600);
        Controls.Add(webView);
        Load += OnLoad;
    }

    private async void OnLoad(object? sender, EventArgs eventArgs)
    {
        try
        {
            Directory.CreateDirectory(ResolveUserDataFolder());
            CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, ResolveUserDataFolder());
            await webView.EnsureCoreWebView2Async(environment);
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                LocalAppHostName,
                ResolveWwwrootPath(),
                CoreWebView2HostResourceAccessKind.DenyCors);
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            webView.CoreWebView2.NavigationCompleted += (_, args) =>
            {
                if (args.IsSuccess) return;
                MessageBox.Show(
                    $"游戏页面加载失败。\n\nWebView2 错误：{args.WebErrorStatus}",
                    BuildWindowTitle(),
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            };
            webView.Source = new Uri($"https://{LocalAppHostName}/index.html");
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                $"无法启动游戏窗口。\n\n{exception.Message}",
                BuildWindowTitle(),
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }

    private static string ResolveWwwrootPath()
    {
        string appDirectory = AppContext.BaseDirectory;
        string wwwrootPath = Path.Combine(appDirectory, "wwwroot");
        string indexPath = Path.Combine(wwwrootPath, "index.html");
        if (!File.Exists(indexPath))
        {
            throw new FileNotFoundException("打包目录缺少 wwwroot/index.html。", indexPath);
        }
        return wwwrootPath;
    }

    private static string ResolveUserDataFolder()
    {
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (string.IsNullOrWhiteSpace(localAppData))
        {
            localAppData = Path.GetTempPath();
        }
        return Path.Combine(localAppData, "SudokuLoot", "WebView2");
    }

    private static string BuildWindowTitle()
    {
        Assembly assembly = Assembly.GetExecutingAssembly();
        string product = assembly.GetCustomAttribute<AssemblyProductAttribute>()?.Product ?? "数独刷宝";
        string version = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "V1.1";
        return $"{product} {version}";
    }
}
