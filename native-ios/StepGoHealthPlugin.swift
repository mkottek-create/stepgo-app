import Foundation
import Capacitor
import HealthKit

// Direkter HealthKit-Zugriff: ausschließlich auf die heutige Schrittzahl.
@objc(StepGoHealthPlugin)
public class StepGoHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StepGoHealthPlugin"
    public let jsName = "StepGoHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readTodaySteps", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let steps = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Apple Health ist auf diesem Geraet nicht verfuegbar.")
            return
        }
        healthStore.requestAuthorization(toShare: [], read: [steps]) { success, error in
            if let error {
                call.reject("Health-Freigabe fehlgeschlagen: \(error.localizedDescription)")
            } else if !success {
                call.reject("Health-Freigabe konnte nicht angefordert werden.")
            } else {
                // HealthKit verrät absichtlich nicht, ob der Nutzer Leserechte verweigert hat.
                call.resolve(["requestCompleted": true])
            }
        }
    }

    @objc func readTodaySteps(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let stepsType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Apple Health ist auf diesem Geraet nicht verfuegbar.")
            return
        }

        let now = Date()
        let midnight = Calendar.current.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(
            withStart: midnight,
            end: now,
            options: .strictStartDate
        )
        let query = HKStatisticsQuery(
            quantityType: stepsType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, result, error in
            if let error {
                call.reject("Schritte konnten nicht gelesen werden: \(error.localizedDescription)")
                return
            }
            let count = result?.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0
            guard count.isFinite, count >= 0, count <= 100000 else {
                call.reject("Apple Health hat eine ungueltige Schrittzahl geliefert.")
                return
            }
            call.resolve([
                "steps": Int(count.rounded(.down)),
                "source": "healthkit",
                "timestamp": now.timeIntervalSince1970
            ])
        }
        healthStore.execute(query)
    }
}

