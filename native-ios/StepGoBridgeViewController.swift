import Capacitor

// In Main.storyboard diesen Controller als Start-ViewController eintragen.
class StepGoBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(StepGoHealthPlugin())
    }
}

