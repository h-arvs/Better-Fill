import {
    world,
    EntityInventoryComponent,
    EntityEquippableComponent,
    EquipmentSlot, ItemStack,
    ItemEnchantableComponent,
    EnchantmentType,
    Player,
    Vector3,
    system
} from "@minecraft/server";

function Vector3ToString(vector: Vector3): string {
    return vector.x.toString() + " " + vector.y.toString() + " " + vector.z.toString()
}
var selections = new Map<Player, [Vector3, Vector3]>()
function giveAxe(player: Player) {
    const container = player.getComponent("minecraft:inventory")
    const equip = player.getComponent("minecraft:equippable")
    var axe = new ItemStack("minecraft:wooden_axe", 1)
    axe.setLore(["selection_axe", "1"])
    const enchantable = axe.getComponent("minecraft:enchantable")
    enchantable.addEnchantment({ type: new EnchantmentType("efficiency"), level: 5 })
    equip.setEquipment(EquipmentSlot.Mainhand, axe)
}

function runFill(raw: string, player: Player): string {
    var split = raw.split(" ")
    if (2 > split.length) return "Usage: !fill <block>"
    var select = selections.get(player)
    if (select === undefined) return "You have not selected anything, run the !select command!"
    var command = "fill "
        + Vector3ToString(select[0])
        + " " + Vector3ToString(select[1])
        + " " + split[1]

    player.dimension.runCommand(command)
    return "Filled selection!"
}

function runReplace(raw: string, player: Player): string {
    var split = raw.split(" ")
    if (3 > split.length) return "Usage: !replace <toreplace> <replacewith>"
    var select = selections.get(player)
    if (select === undefined) return "You have not selected anything, run the !select command!"
    var command = "fill "
        + Vector3ToString(select[0])
        + " " + Vector3ToString(select[1])
        + " " + split[2] + " replace "
        + split[1]

    player.dimension.runCommand(command)
    return "Replaced " + split[1] + " with " + split[2] + " in selection!"
}

world.beforeEvents.chatSend.subscribe(event => {
    const player = event.sender;

    if (event.message.startsWith('!select')) {
        system.run(() => { giveAxe(player) })
        player.sendMessage("Given selection axe, break two blocks to select fill region.")
        event.cancel = true
        return
    }

    if (event.message.startsWith("!fill")) {
        system.run(() => { player.sendMessage(runFill(event.message, player)) })
        event.cancel = true
        return
    }

    if (event.message.startsWith("!replace")) {
        system.run(() => { player.sendMessage(runReplace(event.message, player)) })
        event.cancel = true
        return
    }
});

world.beforeEvents.playerBreakBlock.subscribe(event => {
    system.run(() => {
        if (event.itemStack === undefined) return
        if (event.itemStack.getLore()[0] == "selection_axe") {
            event.cancel = true
            if (event.itemStack.getLore()[1] == "1") {
                event.block.setType("minecraft:redstone_block")
                selections.set(event.player, [event.block.location, event.block.location])
                event.player.sendMessage("Selected block at "
                    + Vector3ToString(event.block.location)
                )
                event.itemStack.setLore(["selection_axe", "2"])
                var equip = event.player.getComponent("minecraft:equippable")
                equip.setEquipment(EquipmentSlot.Mainhand, event.itemStack)
                event.player.sendMessage("Now select a second block.")
            }
            else if (event.itemStack.getLore()[1] == "2") {
                event.block.setType("minecraft:redstone_block")
                var old = selections.get(event.player)
                old[1] = event.block.location
                const newm = selections.set(event.player, old).get(event.player)
                event.player.sendMessage("Selected blocks between regions:\n"
                    + Vector3ToString(newm[0]) + "\n"
                    + Vector3ToString(newm[1])
                )
                var equip = event.player.getComponent("minecraft:equippable")
                equip.setEquipment(EquipmentSlot.Mainhand)
            }
        }
    })
})