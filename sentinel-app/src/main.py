from agents.cyber_agent import cyber_agent
from agents.health_agent import health_agent
from agents.energy_agent import energy_agent
from agents.transport_agent import transport_agent
from agents.nsa_agent import nsa_fusion, nsa_question_brief
from agents.national_security_agent import national_security_brief
from core.router import route_question


def run_daily_brief():

    print("\nCollecting intelligence...\n")

    cyber = cyber_agent("Provide latest cyber threats.")
    health = health_agent("Provide latest health risks.")
    transport = transport_agent()
    energy = energy_agent("Provide latest energy risks.")

    fused = nsa_fusion(cyber, health, transport, energy)

    final = national_security_brief(fused)

    print("\n=== PRESIDENTIAL DAILY BRIEF ===\n")
    print(final)


def main():

    print("\nSentinel Presidential Decision AI")
    print("1. Daily Brief")
    print("2. Ask Question")
    print("Type 'exit' to quit\n")

    while True:

        choice = input("Select option: ")

        if choice.lower() == "exit":
            break

        if choice == "1":
            run_daily_brief()

        elif choice == "2":
            q = input("\nAsk the President's AI: ")

            routed = route_question(q)

            answer = nsa_question_brief(
                routed["agent"],
                routed["response"],
                q
            )

            print("\n--- PRESIDENTIAL RESPONSE ---\n")
            print(answer)


if __name__ == "__main__":
    main()